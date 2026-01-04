import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { JusticeData } from '../types';
import { MatrixCell } from '../utils/analytics';

interface AgreementMatrixProps {
  data: MatrixCell[];
  justices: JusticeData[]; // The axes
  isEraSelected: boolean;
}

const abbreviateName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    const initial = parts[0][0];
    const rest = parts.slice(1).join(' ');
    return `${initial}. ${rest}`;
  }
  return name;
};

const AgreementMatrix: React.FC<AgreementMatrixProps> = ({ data, justices, isEraSelected }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Refs for Zoom Control
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelection = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);

  // Resize Observer to handle dynamic container size (fixes initial zoom bug)
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isEraSelected]); // Re-bind if era selection toggles the view

  useEffect(() => {
    if (!isEraSelected || !svgRef.current || !containerRef.current || justices.length === 0 || containerSize.width === 0) return;

    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 1. Definitions (Gradients/Patterns)
    const defs = svg.append("defs");

    // Pattern for "No Data" (Diagonal Hatch)
    const pattern = defs.append("pattern")
      .attr("id", "diagonalHatch")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 4)
      .attr("height", 4);
    
    pattern.append("rect")
      .attr("width", 4)
      .attr("height", 4)
      .attr("fill", "#f1f5f9"); // Slate-100

    pattern.append("path")
      .attr("d", "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2")
      .attr("stroke", "#cbd5e1") // Slate-300
      .attr("stroke-width", 1);

    // Linear Gradient for Legend
    const linearGradient = defs.append("linearGradient")
      .attr("id", "linear-gradient");

    linearGradient.selectAll("stop")
      .data([
        {offset: "0%", color: "#C5A900"},   // Gold
        {offset: "50%", color: "#ffffff"},   // White
        {offset: "100%", color: "#003366"}   // Blue
      ])
      .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    // 2. Scene Graph Structure
    // zoomGroup: Applies Pan/Zoom transform
    const zoomGroup = svg.append("g").attr("class", "zoom-layer");
    
    // contentGroup: Rotates 45deg to create the diamond shape
    const contentGroup = zoomGroup.append("g").attr("class", "matrix-content");

    // 3. Matrix Configuration
    const cellSize = 20;
    const matrixSize = justices.length * cellSize;
    const diagonal = matrixSize * Math.sqrt(2);
    
    // Scales
    const justiceIDs = justices.map(j => j.justiceID);
    const x = d3.scaleBand().range([0, matrixSize]).domain(justiceIDs).padding(0.05);
    const y = d3.scaleBand().range([0, matrixSize]).domain(justiceIDs).padding(0.05);
    const color = d3.scaleLinear<string>()
      .domain([0.4, 0.65, 1]) 
      .range(["#C5A900", "#ffffff", "#003366"])
      .clamp(true);

    // 4. Render Content
    
    // Rotate the matrix 45 degrees
    contentGroup.attr("transform", "rotate(45)");

    // Tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Cells
    contentGroup.selectAll("rect")
      .data(data, (d: any) => `${d.x}:${d.y}`)
      .join("rect")
      .attr("x", d => x(d.x) || 0)
      .attr("y", d => y(d.y) || 0)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => {
          if (d.shared === 0 && d.x !== d.y) return "url(#diagonalHatch)"; 
          return color(d.rate);
      })
      .style("stroke", d => (d.shared === 0 && d.x !== d.y) ? "#e2e8f0" : "none")
      .style("rx", "2px")
      .on("mouseover", function(event, d) {
        if (d.shared === 0 && d.x !== d.y) return;
        
        d3.select(this)
          .style("stroke", "#0f172a")
          .style("stroke-width", "1.5px")
          .raise();

        const jX = justices.find(j => j.justiceID === d.x)?.justiceName || d.x;
        const jY = justices.find(j => j.justiceID === d.y)?.justiceName || d.y;
        
        tooltip.style("opacity", 1)
          .html(`
            <div class="space-y-1">
              <div class="font-bold border-b border-white/20 pb-1 mb-1 text-white text-sm">
                ${jX} <span class="text-gray-400 text-xs font-normal">vs</span> ${jY}
              </div>
              <div class="flex justify-between gap-4 text-xs">
                <span class="text-gray-300">Agreement:</span>
                <span class="font-mono font-bold text-scc-gold">${(d.rate * 100).toFixed(1)}%</span>
              </div>
              <div class="flex justify-between gap-4 text-xs">
                <span class="text-gray-300">Shared Cases:</span>
                <span class="font-mono text-white">${d.shared}</span>
              </div>
            </div>
          `);
      })
      .on("mousemove", (event) => {
        // Tooltip follows mouse relative to viewport
        const toolTipW = tooltipRef.current?.offsetWidth || 150;
        
        let left = event.clientX + 16;
        let top = event.clientY - 16;
        
        // Simple boundary check
        if (left + toolTipW > window.innerWidth) left = event.clientX - toolTipW - 10;
        
        tooltip
          .style("left", left + "px")
          .style("top", top + "px");
      })
      .on("mouseleave", function() {
        d3.select(this)
          .style("stroke", (d: any) => (d.shared === 0 && d.x !== d.y) ? "#e2e8f0" : "none");
        tooltip.style("opacity", 0);
      });

    // Axes Labels
    // X Axis (Columns)
    contentGroup.selectAll(".label-col")
        .data(justiceIDs)
        .enter().append("text")
        .attr("x", d => (x(d) || 0) + x.bandwidth() / 2)
        .attr("y", -8)
        .text(id => abbreviateName(justices.find(j => j.justiceID === id)?.justiceName || id))
        .style("text-anchor", "start")
        .style("font-size", "10px")
        .style("fill", "#475569")
        // Rotate -45 to make text horizontal relative to screen (since group is +45)
        .attr("transform", d => `rotate(-45, ${(x(d) || 0) + x.bandwidth() / 2}, -8)`);

    // Y Axis (Rows)
    contentGroup.selectAll(".label-row")
        .data(justiceIDs)
        .enter().append("text")
        .attr("x", -8)
        .attr("y", d => (y(d) || 0) + y.bandwidth() / 2)
        .text(id => abbreviateName(justices.find(j => j.justiceID === id)?.justiceName || id))
        .style("text-anchor", "end")
        .style("font-size", "10px")
        .style("fill", "#475569")
        // Rotate -45 to make text horizontal relative to screen
        .attr("transform", d => `rotate(-45, -8, ${(y(d) || 0) + y.bandwidth() / 2})`);

    // 5. Legend (Static Overlay)
    const legendWidth = 160;
    const legendHeight = 8;
    const legendGroup = svg.append("g")
      .attr("class", "legend-layer")
      .attr("transform", `translate(20, 20)`);
    
    // Background for legend to make it readable over data
    legendGroup.append("rect")
       .attr("x", -10)
       .attr("y", -10)
       .attr("width", legendWidth + 20)
       .attr("height", 60)
       .attr("fill", "rgba(255,255,255,0.9)")
       .attr("rx", 4);

    legendGroup.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .text("Pairwise Agreement")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("fill", "#334155");

    legendGroup.append("rect")
      .attr("y", 10)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#linear-gradient)")
      .style("stroke", "#e2e8f0")
      .attr("rx", 2);

    legendGroup.append("text").attr("x", 0).attr("y", 30).text("<40%").style("font-size", "9px").style("fill", "#C5A900");
    legendGroup.append("text").attr("x", legendWidth/2).attr("y", 30).text("65%").style("font-size", "9px").style("fill", "#94a3b8").style("text-anchor", "middle");
    legendGroup.append("text").attr("x", legendWidth).attr("y", 30).text("100%").style("font-size", "9px").style("fill", "#003366").style("text-anchor", "end");

    // 6. Zoom Logic
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4]) // Allow zooming out to see huge matrices, and in
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      });

    // Store for external control
    zoomBehavior.current = zoom;
    svgSelection.current = svg;

    svg.call(zoom);

    // Initial Zoom Fit
    const initialScale = Math.min(
        (containerWidth - 60) / diagonal,
        (containerHeight - 60) / diagonal
    ) || 0.5;

    const centerX = 0; 
    const centerY = diagonal / 2;

    const initialTx = containerWidth / 2 - (centerX * initialScale);
    const initialTy = containerHeight / 2 - (centerY * initialScale);

    svg.call(zoom.transform, d3.zoomIdentity.translate(initialTx, initialTy).scale(initialScale));

  }, [data, justices, isEraSelected, containerSize]);

  const handleZoom = (factor: number) => {
     if (svgSelection.current && zoomBehavior.current) {
        svgSelection.current
           .transition().duration(300)
           .call(zoomBehavior.current.scaleBy, factor);
     }
  };

  // Handle Era Selection Needed State
  if (!isEraSelected) {
    return (
       <div className="w-full h-96 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-500 p-6">
           <div className="text-4xl mb-4 opacity-50">📅</div>
           <h3 className="text-lg font-serif font-bold text-slate-700">Era Selection Required</h3>
           <p className="text-sm text-center max-w-sm mt-2 leading-relaxed">
               The Agreement Matrix visualizes pairwise relationships. To maintain readability and relevance, please select a specific Court Era from the top control ribbon.
           </p>
       </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-[600px] bg-slate-50 rounded-lg relative overflow-hidden cursor-grab active:cursor-grabbing border border-slate-200">
        <div 
            ref={tooltipRef}
            className="fixed z-[60] pointer-events-none bg-slate-900 text-white p-3 rounded shadow-xl text-sm opacity-0 transition-opacity duration-100"
            style={{ top: 0, left: 0 }}
        />
        <svg ref={svgRef} width="100%" height="100%"></svg>
        
        {/* Zoom Controls */}
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
        
        {/* Helper Badge */}
        <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur px-2 py-1 rounded border border-slate-200 text-[10px] text-slate-400 pointer-events-none shadow-sm">
            Pan & Zoom Enabled
        </div>
    </div>
  );
};

export default AgreementMatrix;