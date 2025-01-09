import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import * as d3 from 'd3';
import _ from 'lodash';

const ConnectomeVisualization = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNeurotransmitter, setSelectedNeurotransmitter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/src/data/Connectome.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        if (result.errors.length > 0) {
          console.warn("CSV parsing errors:", result.errors);
        }
        setData(result.data);
      } catch (error) {
        console.error('Error reading file:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    try {
      // Clear previous visualization
      d3.select(svgRef.current).selectAll('*').remove();

      // Set up the SVG
      const width = 600;
      const height = 500;
      const svg = d3.select(svgRef.current)
        .attr('viewBox', [0, 0, width, height]);

      // Create a container group for all visualized elements
      const container = svg.append('g');

      // Function to determine neuron type
      function getNeuronType(neuronName) {
        if (!neuronName) return 'Unknown';
        
        // Muscle cells
        if (neuronName.startsWith('M')) {
          return 'Muscle';
        }
        
        // Known sensory neurons
        const sensoryNeurons = ['ADF', 'ADL', 'AFD', 'ALM', 'AQR', 'ASE', 'ASG', 'ASH', 'ASI', 'ASJ', 'ASK', 'AVM', 'AWA', 'AWB', 'AWC', 'BAG', 'CEP', 'FLP', 'IL1', 'IL2', 'OLL', 'OLQ', 'PHA', 'PHB', 'PHC', 'PLM', 'PVD', 'SAA', 'SDQ', 'URA', 'URB', 'URX', 'URY'];
        if (sensoryNeurons.some(prefix => neuronName.startsWith(prefix))) {
          return 'Sensory';
        }

        // Motor neurons
        const motorNeurons = ['DA', 'DB', 'DD', 'VA', 'VB', 'VC', 'VD', 'AS', 'PDA', 'PDB', 'RMD', 'RME', 'RMF', 'RMH', 'SMB', 'SMD'];
        if (motorNeurons.some(prefix => neuronName.startsWith(prefix))) {
          return 'Motor';
        }

        // Others are interneurons
        return 'Interneuron';
      }

      // Create nodes and links data
      const nodes = Array.from(new Set([
        ...data.map(d => d.Origin),
        ...data.map(d => d.Target)
      ])).map(id => ({ id }));

      const links = data.map(d => ({
        source: d.Origin,
        target: d.Target,
        type: d.Type,
        neurotransmitter: d.Neurotransmitter,
        connections: d['Number of Connections']
      }));

      // Assign types to nodes
      nodes.forEach(node => {
        node.type = getNeuronType(node.id);
      });

      // Calculate node degrees (total connections)
      const nodeDegrees = {};
      links.forEach(link => {
        nodeDegrees[link.source] = (nodeDegrees[link.source] || 0) + link.connections;
        nodeDegrees[link.target] = (nodeDegrees[link.target] || 0) + link.connections;
      });
      nodes.forEach(node => {
        node.degree = nodeDegrees[node.id] || 0;
      });

      // Color scales
      const neuronTypeColors = {
        'Sensory': '#00FFFF',     // Cyan
        'Interneuron': '#FF00FF', // Magenta
        'Motor': '#00ff2b',       // Green
        'Muscle': '#fff400',      // Yellow
        'Unknown': '#999999'      // Gray
      };

      // Add zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          container.attr('transform', event.transform);
        });

      svg.call(zoom);

      // Force simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.degree) + 5));

      // Create links
      const link = container.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .style('stroke-width', d => Math.sqrt(d.connections))
        .style('stroke', d => d.type === 'GapJunction' ? '#999' : '#666')
        .style('stroke-dasharray', d => d.type === 'GapJunction' ? '5,5' : 'none')
        .style('opacity', d => 
          selectedNeurotransmitter === 'all' || 
          d.neurotransmitter === selectedNeurotransmitter ? 0.6 : 0.1
        );

      // Create nodes
      const node = container.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => Math.sqrt(d.degree) + 3)
        .style('fill', d => neuronTypeColors[d.type])
        .style('stroke', '#333')
        .style('stroke-width', 1.5)
        .on('mouseover', (event, d) => {
          setHoveredNode(d);
          d3.select(event.currentTarget)
            .style('stroke-width', 3)
            .style('fill', '#f0f0f0');
        })
        .on('mouseout', (event, d) => {
          setHoveredNode(null);
          d3.select(event.currentTarget)
            .style('stroke-width', 1.5)
            .style('fill', neuronTypeColors[d.type]);
        })
        .call(drag(simulation));

      // Add labels to nodes
      const label = container.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .text(d => d.id)
        .attr('font-size', '8px')
        .attr('dx', 12)
        .attr('dy', 4)
        .style('pointer-events', 'none');

      // Add legend
      const legend = svg.append('g')
        .attr('transform', `translate(${width - 150}, 20)`);

      const legendData = Object.entries(neuronTypeColors)
        .filter(([type]) => type !== 'Unknown')
        .map(([type, color]) => ({ type, color }));

      const legendEntries = legend.selectAll('g')
        .data(legendData)
        .join('g')
        .attr('transform', (d, i) => `translate(0, ${i * 25})`);

      legendEntries.append('circle')
        .attr('r', 6)
        .style('fill', d => d.color)
        .style('stroke', '#333')
        .style('stroke-width', 1);

      legendEntries.append('text')
        .attr('x', 15)
        .attr('y', 5)
        .text(d => d.type)
        .style('font-size', '12px');

      // Add zoom controls
      const zoomControls = svg.append('g')
        .attr('transform', `translate(20, ${height - 60})`);

      // Zoom in button
      zoomControls.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 30)
        .attr('height', 30)
        .attr('fill', 'white')
        .attr('stroke', '#333')
        .style('cursor', 'pointer')
        .on('click', () => {
          svg.transition()
            .duration(750)
            .call(zoom.scaleBy, 1.3);
        });

      zoomControls.append('text')
        .attr('x', 15)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '20px')
        .style('pointer-events', 'none')
        .text('+');

      // Zoom out button
      zoomControls.append('rect')
        .attr('x', 0)
        .attr('y', 35)
        .attr('width', 30)
        .attr('height', 30)
        .attr('fill', 'white')
        .attr('stroke', '#333')
        .style('cursor', 'pointer')
        .on('click', () => {
          svg.transition()
            .duration(750)
            .call(zoom.scaleBy, 1 / 1.3);
        });

      zoomControls.append('text')
        .attr('x', 15)
        .attr('y', 55)
        .attr('text-anchor', 'middle')
        .style('font-size', '20px')
        .style('pointer-events', 'none')
        .text('−');

      // Reset zoom button
      zoomControls.append('rect')
        .attr('x', 35)
        .attr('y', 0)
        .attr('width', 50)
        .attr('height', 30)
        .attr('fill', 'white')
        .attr('stroke', '#333')
        .style('cursor', 'pointer')
        .on('click', () => {
          svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
        });

      zoomControls.append('text')
        .attr('x', 60)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .text('Reset');

      // Update positions on simulation tick
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);

        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      });

      // Drag functions
      function drag(simulation) {
        function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        }

        function dragged(event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        }

        function dragended(event) {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }

        return d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended);
      }

    } catch (error) {
      console.error('Error in visualization:', error);
      setError(error.message);
    }
  }, [data, selectedNeurotransmitter]);

  if (loading) {
    return <div>Loading connectome data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-2">
      <div className="flex flex-row gap-4">
        {/* Main visualization area */}
        <div className="flex-grow relative">
          <select
            id="neurotransmitter-select"
            className="absolute top-2 left-2 z-10 p-2 border rounded bg-white"
            value={selectedNeurotransmitter}
            onChange={(e) => setSelectedNeurotransmitter(e.target.value)}
          >
            <option value="all">All Neurotransmitters</option>
            {data && Array.from(new Set(data.map(d => d.Neurotransmitter))).sort().map(nt => (
              <option key={nt} value={nt}>{nt}</option>
            ))}
          </select>
          <svg
            ref={svgRef}
            className="w-full border rounded bg-white"
            style={{ height: '85vh' }}
          />
        </div>
  
        {/* Right sidebar for info and controls */}
        <div className="w-64 flex flex-col gap-4">
          <div className="text-sm space-y-2">
            <p>• Solid lines represent chemical synapses</p>
            <p>• Dashed lines represent gap junctions</p>
            <p>• Line thickness indicates connection strength</p>
            <p>• Node size represents total number of connections</p>
          </div>
          {hoveredNode && (
            <div className="bg-white p-2 border rounded shadow">
              <p className="text-sm font-bold">{hoveredNode.id}</p>
              <p className="text-xs">Type: {hoveredNode.type}</p>
              <p className="text-xs">Connections: {hoveredNode.degree}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectomeVisualization;