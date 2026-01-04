import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '../utils/analytics';

interface NetworkGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  threshold: number; // 0 to 1
  onThresholdChange: (value: number) => void;
  isEraSelected: boolean;
}

// Simple Label Propagation Algorithm for Community Detection with Absorption
// UPDATED: Now uses Mean Connection Strength instead of Sum of Weights to prevent
// large cliques from absorbing distinct smaller groups (The "Rich Get Richer" fix).
const detectCommunities = (nodes: any[], links: any[]) => {
  // 1. Initialize: Each node is its own community
  const communities = new Map<string, string>();
  nodes.forEach(n => communities.set(n.id, n.id));

  // Build Adjacency Map with weights
  const adj = new Map<string, { target: string, weight: number }[]>();
  nodes.forEach(n => adj.set(n.id, []));
  links.forEach(l => {
    // Links in D3 force might be objects or strings depending on stage, 
    // but here we are passing raw filtered data before simulation starts
    const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
    
    adj.get(sourceId)?.push({ target: targetId, weight: l.value });
    adj.get(targetId)?.push({ target: sourceId, weight: l.value });
  });

  // 2. Propagate Labels (Iterations)
  // 5 iterations is usually sufficient for small-medium graphs to stabilize
  for (let i = 0; i < 5; i++) {
    // Shuffle order to prevent oscillation
    const shuffledIds = d3.shuffle(nodes.map(n => n.id));
    
    shuffledIds.forEach(nodeId => {
      const neighbors = adj.get(nodeId) || [];
      if (neighbors.length === 0) return;

      // Count weighted votes and number of neighbors per community
      const commStats = new Map<string, { totalWeight: number, count: number }>();
      
      neighbors.forEach(neighbor => {
        const neighborComm = communities.get(neighbor.target)!;
        const w = neighbor.weight;
        
        if (!commStats.has(neighborComm)) {
            commStats.set(neighborComm, { totalWeight: 0, count: 0 });
        }
        const stats = commStats.get(neighborComm)!;
        stats.totalWeight += w;
        stats.count += 1;
      });

      // Find Max Average Weight (Mean Strength)
      let maxAvgWeight = -1;
      let bestComm = communities.get(nodeId)!;
      
      commStats.forEach((stats, comm) => {
        const avg = stats.totalWeight / stats.count;
        if (avg > maxAvgWeight) {
          maxAvgWeight = avg;
          bestComm = comm;
        } else if (avg === maxAvgWeight) {
          // Tie-breaker: prefer current or deterministic ID
          if (comm < bestComm) bestComm = comm;
        }
      });

      communities.set(nodeId, bestComm);
    });
  }

  // 3. Rank Communities by Size
  const sizeMap = new Map<string, number>();
  communities.forEach((comm) => {
    sizeMap.set(comm, (sizeMap.get(comm) || 0) + 1);
  });

  const sortedComm = Array.from(sizeMap.entries()).sort((a, b) => b[1] - a[1]);
  const commRank = new Map<string, number>(); // Community ID -> Rank (0, 1, 2...)
  sortedComm.forEach((entry, index) => commRank.set(entry[0], index));

  const commIdA = sortedComm[0]?.[0]; // Largest Bloc ID
  const commIdB = sortedComm[1]?.[0]; // Second Largest Bloc ID

  // 4. Assign Groups with Absorption Logic (Also updated to Mean Strength)
  nodes.forEach(n => {
    const currentComm = communities.get(n.id)!;
    let rank = commRank.get(currentComm)!;

    // ABSORPTION STEP:
    // If a node is in a small cluster (Rank >= 2) or isolated, check its connections.
    // If it has stronger weighted connections to A or B, absorb it into that group.
    if (rank >= 2 && commIdA) {
        const neighbors = adj.get(n.id) || [];
        let weightToA = 0; let countToA = 0;
        let weightToB = 0; let countToB = 0;

        neighbors.forEach(nbr => {
            const nbrComm = communities.get(nbr.target)!;
            if (nbrComm === commIdA) { weightToA += nbr.weight; countToA++; }
            else if (nbrComm === commIdB) { weightToB += nbr.weight; countToB++; }
        });

        const avgToA = countToA > 0 ? weightToA / countToA : 0;
        const avgToB = countToB > 0 ? weightToB / countToB : 0;

        if (avgToA > avgToB && avgToA > 0) {
            rank = 0; // Absorb into A
        } else if (avgToB > avgToA && avgToB > 0) {
            rank = 1; // Absorb into B
        }
    }

    n.group = rank; // 0 = Largest, 1 = Second Largest
  });
};

const NetworkGraph: React.FC<NetworkGraphProps> = ({ nodes, links, threshold, onThresholdChange, isEraSelected }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // State for dimension
  const [containerSize, setContainerSize] = useState({ width: 800, height: 800 });
  
  // Refs for Zoom Control
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelection = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!isEraSelected || !svgRef.current || nodes.length === 0) return;

    // 1. Prepare Data
    // Filter links based on threshold first
    const filteredLinks = links.filter(l => l.value >= threshold).map(d => ({ ...d }));

    // Identify active nodes (exclude isolated nodes)
    const connectedNodeIds = new Set<string>();
    filteredLinks.forEach(l => {
        // Handle both string IDs (initial) and object refs (if already processed)
        const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
        connectedNodeIds.add(sourceId);
        connectedNodeIds.add(targetId);
    });

    // Only include nodes that are part of at least one link
    const simulationNodes = nodes
        .filter(n => connectedNodeIds.has(n.id))
        .map(d => ({ ...d }));

    // Calculate Degrees for Dynamic Sizing
    const degreeMap = new Map<string, number>();
    simulationNodes.forEach(n => degreeMap.set(n.id, 0));
    filteredLinks.forEach(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
        degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
    });

    const maxDegree = Math.max(...Array.from(degreeMap.values()), 1);
    const radiusScale = d3.scaleSqrt()
        .domain([0, maxDegree])
        .range([6, 20]); // Min 6px, Max 20px

    // 2. Run Community Detection on the *filtered* topology
    detectCommunities(simulationNodes, filteredLinks);

    const width = containerSize.width;
    const height = containerSize.height;

    // Clear previous
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Zoom container
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomBehavior.current = zoom;
    svgSelection.current = svg;
    svg.call(zoom);

    // Simulation Setup
    // UPDATED PHYSICS:
    // 1. Dynamic Distance: High agreement = close, Low agreement = far.
    // 2. Increased Repulsion: -1000 to push the web apart and reduce the "hairball" effect.
    const simulation = d3.forceSimulation(simulationNodes)
      .force("link", d3.forceLink(filteredLinks)
          .id((d: any) => d.id)
          .distance((d: any) => {
             // Invert agreement for distance: 
             // 1.0 (100% agreement) -> 50px (Tight)
             // 0.6 (60% agreement) -> ~530px (Loose)
             return 50 + ((1 - d.value) * 1200);
          })
      )
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => radiusScale(degreeMap.get(d.id) || 0) + 15));

    // Render Links
    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      // Use Cubic scale for thickness to exaggerate high agreement rates and thin out lower ones
      .attr("stroke-width", d => Math.max(0.5, Math.pow((d.value - 0.3), 3) * 40))
      .attr("stroke", d => d3.interpolateBlues(d.value));

    // Render Nodes
    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .selectAll("circle")
      .data(simulationNodes)
      .join("circle")
      .attr("r", (d: any) => radiusScale(degreeMap.get(d.id) || 0))
      .attr("fill", (d: any) => {
          // Color Logic:
          // Group 0 (Largest) -> Blue (Conservative/Dominant)
          // Group 1 (2nd Largest) -> Red (Liberal/Dissenting)
          // Others -> Gold
          if (d.group === 0) return '#003366'; // scc-blue
          if (d.group === 1) return '#ef4444'; // Red
          return '#C5A900'; // scc-gold
      })
      .style("cursor", "pointer")
      .call(drag(simulation) as any);

    // Labels
    const text = g.append("g")
      .selectAll("text")
      .data(simulationNodes)
      .join("text")
      .text(d => d.name)
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#333")
      .attr("dx", (d: any) => radiusScale(degreeMap.get(d.id) || 0) + 4)
      .attr("dy", 4)
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white"); // Halo for readability

    // Tooltip Events
    node
      .on("mouseover", (event, d: any) => {
        const currentR = radiusScale(degreeMap.get(d.id) || 0);
        // Highlight Node
        d3.select(event.currentTarget)
          .transition().duration(200)
          .attr("stroke", "#000")
          .attr("r", currentR + 6);
        
        const connectedLinks = filteredLinks.filter((l: any) => l.source.id === d.id || l.target.id === d.id);
        const neighborCount = connectedLinks.length;
        const avgAgreement = neighborCount > 0 
            ? d3.mean(connectedLinks, (l: any) => l.value) || 0
            : 0;

        let blocName = "Independent / Unaligned";
        let blocColor = "text-scc-gold";
        if (d.group === 0) { blocName = "Bloc A (Dominant)"; blocColor = "text-blue-300"; }
        if (d.group === 1) { blocName = "Bloc B (Secondary)"; blocColor = "text-red-300"; }

        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("opacity", 1)
          .html(`
             <div class="font-bold border-b border-white/20 pb-1 mb-1 text-white text-xs">${d.name}</div>
             <div class="space-y-1 text-[10px]">
                 <div class="flex justify-between gap-4">
                   <span class="text-gray-300">Affiliation:</span>
                   <span class="font-bold ${blocColor}">${blocName}</span>
                </div>
                <div class="flex justify-between gap-4">
                   <span class="text-gray-300">Connections:</span>
                   <span class="font-mono text-white">${neighborCount}</span>
                </div>
                <div class="flex justify-between gap-4">
                   <span class="text-gray-300">Avg Agreement:</span>
                   <span class="font-mono text-scc-gold font-bold">${(avgAgreement * 100).toFixed(1)}%</span>
                </div>
             </div>
          `);
      })
      .on("mousemove", (event) => {
        d3.select(tooltipRef.current)
          .style("left", (event.clientX + 15) + "px")
          .style("top", (event.clientY - 15) + "px");
      })
      .on("mouseout", (event, d: any) => {
        const currentR = radiusScale(degreeMap.get(d.id) || 0);
        d3.select(event.currentTarget)
          .transition().duration(200)
          .attr("stroke", "#fff")
          .attr("r", currentR);
        
        d3.select(tooltipRef.current).style("opacity", 0);
      });
    
    link.append("title")
      .text(d => `Agreement: ${(d.value * 100).toFixed(1)}%`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
        
      text
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    return () => {
        simulation.stop();
    };

  }, [nodes, links, threshold, containerSize, isEraSelected]);

  function drag(simulation: d3.Simulation<GraphNode, undefined>) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  const handleZoom = (factor: number) => {
     if (svgSelection.current && zoomBehavior.current) {
        svgSelection.current
           .transition().duration(300)
           .call(zoomBehavior.current.scaleBy, factor);
     }
  };

  if (!isEraSelected) {
    return (
       <div className="w-full h-96 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-500 p-6">
           <div className="text-4xl mb-4 opacity-50">🕸️</div>
           <h3 className="text-lg font-serif font-bold text-slate-700">Era Selection Required</h3>
           <p className="text-sm text-center max-w-sm mt-2 leading-relaxed">
               The Bench Alignment Protocol visualizes complex topologies. To maintain readability and relevance, please select a specific Court Era from the top control ribbon.
           </p>
       </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-[600px] border border-slate-200 rounded-lg bg-white shadow-inner overflow-hidden relative">
      <div 
         ref={tooltipRef}
         className="fixed z-50 pointer-events-none bg-slate-900 text-white p-2 rounded shadow-xl opacity-0 transition-opacity duration-200"
         style={{ top: 0, left: 0 }}
      />
      
      {/* Legend (Top Left) */}
      <div className="absolute top-4 left-4 bg-white/90 p-2 rounded-lg border border-slate-200 shadow-sm z-10 text-[10px]">
          <h4 className="font-bold text-gray-700 mb-1 border-b pb-1">Detected Blocs</h4>
          <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#003366]"></div>
              <span>Group A (Dominant)</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
              <span>Group B (Secondary)</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C5A900]"></div>
              <span>Independent</span>
          </div>
      </div>

      {/* Threshold Slider (Top Right) */}
      <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-lg border border-slate-200 shadow-sm z-10 w-48">
        <div className="flex justify-between mb-1">
            <label className="text-[10px] font-bold text-gray-700 uppercase">Link Threshold</label>
            <span className="text-[10px] font-bold text-scc-blue">{(threshold * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-400">60%</span>
            <input 
                type="range" min="0.6" max="0.99" step="0.01" 
                value={threshold} 
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-scc-blue"
            />
            <span className="text-[9px] text-gray-400">99%</span>
        </div>
      </div>

      {/* Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
          <button 
             onClick={() => handleZoom(1.2)}
             className="w-8 h-8 bg-white border border-slate-300 rounded-full shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-scc-blue font-bold text-lg transition-colors focus:outline-none"
             title="Zoom In"
          >
             +
          </button>
          <button 
             onClick={() => handleZoom(0.8)}
             className="w-8 h-8 bg-white border border-slate-300 rounded-full shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-scc-blue font-bold text-lg transition-colors focus:outline-none"
             title="Zoom Out"
          >
             −
          </button>
      </div>

      <svg ref={svgRef} width="100%" height="100%" className="cursor-move"></svg>
    </div>
  );
};

export default NetworkGraph;