import React, { useMemo, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CaseData, IssueData } from '../types';
import { ISSUE_AREAS } from '../utils/constants';

interface SubjectMatterTreemapProps {
  cases: CaseData[];
  issues: IssueData[];
}

const COLORS = [
  '#003366', // scc-blue
  '#C5A900', // scc-gold
  '#334155', // slate-700
  '#b91c1c', // red-700
  '#15803d', // green-700
  '#7e22ce', // purple-700
  '#c2410c', // orange-700
  '#0369a1', // sky-700
];

const truncate = (str: string, n: number) => {
    return (str.length > n) ? str.substring(0, n-1) + '..' : str;
};

const SubjectMatterTreemap: React.FC<SubjectMatterTreemapProps> = ({ cases, issues }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Process Data
  const data = useMemo(() => {
    // Filter issues to only those in the current case list
    const caseIds = new Set(cases.map(c => c.primaryCaseID));
    
    const counts = new Map<string, number>();
    
    issues.forEach(i => {
       if (i.primaryCaseID && caseIds.has(i.primaryCaseID) && i.issueAreaCan) {
           const areaCode = i.issueAreaCan.trim();
           const areaName = ISSUE_AREAS[areaCode] || `Unknown (${areaCode})`;
           counts.set(areaName, (counts.get(areaName) || 0) + 1);
       }
    });

    const result = Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort desc for stability

    return result;
  }, [cases, issues]);

  // Calculate total for percentage
  const totalDecisions = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

  // 2. Measure Container
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 3. Render D3 Chart
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const svg = d3.select(svgRef.current);
    const width = dimensions.width;
    const height = dimensions.height;

    // Create Hierarchy
    // We need a wrapper root because D3 treemap expects a hierarchy, but we have a flat list of categories
    const root = d3.hierarchy({ children: data } as any)
        .sum((d: any) => d.value)
        .sort((a, b) => b.value! - a.value!);

    // Compute Layout
    d3.treemap()
        .size([width, height])
        .paddingInner(2)
        .paddingOuter(0)
        .round(true)
        (root);

    // Cast leaves to include rectangular properties (x0, y0, x1, y1)
    const leaves = root.leaves() as d3.HierarchyRectangularNode<any>[];

    // Transition Config
    const t = svg.transition().duration(800).ease(d3.easeCubicOut);

    // DATA JOIN
    // Key function is essential for object constancy (morphing)
    const nodes = svg.selectAll<SVGGElement, d3.HierarchyRectangularNode<any>>(".node")
        .data(leaves, (d) => d.data.name);

    // EXIT
    // Fade out and remove nodes that are no longer present
    nodes.exit()
        .transition(t)
        .style("opacity", 0)
        .remove();

    // ENTER
    // Create new nodes
    const enterGroup = nodes.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x0},${d.y0})`) // Start at new position
        .style("opacity", 0); // Fade in

    enterGroup.append("rect")
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", (d, i) => COLORS[leaves.indexOf(d) % COLORS.length])
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("rx", 4);

    enterGroup.append("text")
        .attr("class", "label-name")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .style("pointer-events", "none")
        .text(d => truncate(d.data.name, 12))
        .attr("x", d => (d.x1 - d.x0) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2 - 6);

    enterGroup.append("text")
        .attr("class", "label-val")
        .attr("text-anchor", "middle")
        .attr("fill", "rgba(255,255,255,0.8)")
        .attr("font-size", "10px")
        .style("pointer-events", "none")
        .text(d => `${d.data.value} cases`)
        .attr("x", d => (d.x1 - d.x0) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2 + 10);

    // MERGE (Update existing + new)
    const merged = nodes.merge(enterGroup);

    // Transition Group Position
    merged.transition(t)
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .style("opacity", 1);

    // Transition Rect Size & Color
    merged.select("rect")
        .transition(t)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", (d, i) => COLORS[leaves.indexOf(d) % COLORS.length]);

    // Transition Text Positions & Visibility
    // We hide text if the box is too small
    merged.select(".label-name")
        .transition(t)
        .attr("x", d => (d.x1 - d.x0) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2 - 6)
        .style("opacity", d => (d.x1 - d.x0 > 60 && d.y1 - d.y0 > 30) ? 1 : 0);

    merged.select(".label-val")
        .transition(t)
        .text(d => `${d.data.value} cases`) // Update text count
        .attr("x", d => (d.x1 - d.x0) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2 + 10)
        .style("opacity", d => (d.x1 - d.x0 > 60 && d.y1 - d.y0 > 30) ? 1 : 0);

    // Tooltip Events
    merged
        .on("mouseover", function(event, d) {
            d3.select(this).select("rect")
              .attr("stroke", "#0f172a")
              .attr("stroke-width", 2);
            
            const share = totalDecisions > 0 
                ? ((d.data.value / totalDecisions) * 100).toFixed(1) 
                : '0.0';

            const tooltip = d3.select(tooltipRef.current);
            tooltip.style("opacity", 1);
            tooltip.html(`
                <div class="font-bold text-gray-800">${d.data.name}</div>
                <div class="text-gray-600">Decisions: ${d.data.value}</div>
                <div class="text-scc-blue font-bold text-xs mt-1">Share: ${share}%</div>
            `);
        })
        .on("mousemove", (event) => {
            const tooltip = d3.select(tooltipRef.current);
            // Tooltip positioning
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const x = event.clientX - rect.left + 10;
                const y = event.clientY - rect.top + 10;
                tooltip
                    .style("left", x + "px")
                    .style("top", y + "px");
            }
        })
        .on("mouseleave", function() {
            d3.select(this).select("rect")
              .attr("stroke", "#fff")
              .attr("stroke-width", 1);
            
            d3.select(tooltipRef.current).style("opacity", 0);
        });

  }, [data, dimensions, totalDecisions]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col overflow-hidden relative">
      <div className="mb-4">
        <h3 className="text-xl font-serif text-scc-blue mb-1">Subject Matter Diet</h3>
        <p className="text-sm text-gray-500">
          Distribution of legal issues addressed by the Court.
        </p>
      </div>

      <div ref={containerRef} className="flex-grow w-full relative">
         {data.length > 0 ? (
             <>
                 <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="block" />
                 <div 
                    ref={tooltipRef}
                    className="absolute pointer-events-none bg-white p-3 border border-slate-200 shadow-lg rounded text-sm z-50 opacity-0 transition-opacity duration-200"
                    style={{ top: 0, left: 0 }}
                 />
             </>
         ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No issue data available.
            </div>
         )}
      </div>
      
      <div className="mt-4 pt-2 text-xs text-gray-400 flex justify-between border-t border-slate-100">
         <span>Top Area: {data[0]?.name || 'N/A'}</span>
         <span>{data.length} Unique Categories</span>
      </div>
    </div>
  );
};

export default SubjectMatterTreemap;