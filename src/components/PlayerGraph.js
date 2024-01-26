import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getContrastYIQ, playerColors } from '../utils/utils';

const PlayerGraph = ({ size, height, width, data, strongestPlayer, strongestPair }) => {
  const margin = { top: 20, right: 20, bottom: 40, left: 20 };

  const svgRef = useRef();

  const createGroupCenters = () => {
    const numGroups = data.nodes.reduce((prev, curr) => curr.group > prev ? curr.group : prev, 0) + 1;
    const numCols = Math.ceil(Math.sqrt(numGroups));
    const numRows = Math.ceil(numGroups / numCols);
    const groupCenters = {};
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; (j < numCols) && (i * numCols + j < numGroups); j++) {
        groupCenters[i * numCols + j] = {
          x: ((j + 1) * width) / (numCols + 1),
          y: ((i + 1) * height) / (numRows + 1)
        }
      }
    }

    return groupCenters;
  }

  useEffect(() => {

    const groupCenters = createGroupCenters();
    // Set dimensions and margins for the graph

    // Remove any existing SVG to avoid overlapping
    d3.select(svgRef.current).selectAll("*").remove();

    // Create an SVG element
    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Increase the node size dynamically or to a fixed value larger than 5
    const nodeRadius = size === "small" ? 20 : 30;  // Or make it dynamic based on data
    const minValue = 0;
    const maxValue = data.topScore;
    // Normalize your values (example function, you'll need to adjust this to your data)
    function normalizeValue(value) {
      // Example normalization that you might need to adjust according to your data range
      return (value - minValue) / (maxValue - minValue);
    }

    // Adjust link distance based on normalized value
    const linkDistance = (d) => {
      const normalizedValue = normalizeValue(d.value);
      // Set a base distance and adjust it according to your normalized value
      const baseDistance = 60; // The base distance for a value of 1
      return baseDistance * (1 / normalizedValue);
    };

    const strokeWidth = (d) => {
      const normalizedValue = normalizeValue(d.value);
      const baseWidth = 30;
      return baseWidth * normalizedValue;
    }

    // Adjust forceManyBody strength for more reasonable repulsion
    const repulsionStrength = -1000 / Object.keys(groupCenters).length;

    // Define a function that calculates the total connection strength for a node
    function calculateTotalConnectionStrength(node, links) {
      // Sum the strength of all connections where this node is the source or target
      const strength = links.reduce((acc, link) => {
        if (link.source.id === node.id || link.target.id === node.id) {
          return acc + link.value; // Assuming 'value' is the strength of the connection
        }
        return acc;
      }, 0);

      return strength / 10;
    }

    // Assume you have functions to determine these:
    const isStrongestPair = d => {
      return (d.source.id === strongestPair.source && d.target.id === strongestPair.target) ||
        (d.source.id === strongestPair.target && d.target.id === strongestPair.source)
    }

    const getFontSize = (d) => {
      const size = 20 - d.id.length;
      return size + 'px';
    }

    const strongestToCenter = (d) => {
      if (d.id === strongestPlayer) {
        return 40;
      }
      return 0;
    }

    // Custom centering force
    const customCenterForce = () => {
      const alpha = .5;

      data.nodes.forEach(d => {
        const dNodes = data.nodes.filter(n => n.group === d.group).map(n => n.id);
        const dLinks = data.links.filter(l => dNodes.includes(l.source.id) || dNodes.includes(l.target.id));
        const dGroupLinkStrength = {};
        for (let link of dLinks) {
          if (dGroupLinkStrength[link.source.id]) {
            dGroupLinkStrength[link.source.id] += link.value;
          } else {
            dGroupLinkStrength[link.source.id] = link.value;
          }
        }

        const strongestGroupMember = Object.entries(dGroupLinkStrength).sort((a, b) => b[1] - a[1])[0];

        const isStrongest = dLinks.length === 0 || strongestGroupMember[0] === d.id;

        const centerPullStrength = isStrongest ? 1 : 0.003;
        // Calculate direction towards or away from the center
        const direction = isStrongest ? 1 : -1;

        // Apply the force
        d.vx += direction * (groupCenters[d.group].x - d.x) * alpha * centerPullStrength;
        d.vy += direction * (groupCenters[d.group].y - d.y) * alpha * centerPullStrength;
      });

    };

    // Create a simulation for positioning nodes with adjusted forces
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(linkDistance).strength(1))
      .force("charge", d3.forceManyBody().strength(repulsionStrength))
      .force("x", d3.forceX().x(d => groupCenters[d.group].x))
      .force("y", d3.forceY().y(d => groupCenters[d.group].y))
      // .force("x", d3.forceX().x(width/2))
      // .force("y", d3.forceY().y(height/2))
      // .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(nodeRadius * 1.5)) // Add collision force
      .alphaDecay(0.01)
      .velocityDecay(0.3);

    // Run the simulation for a set number of ticks to stabilize
    // const numTicks = 150;
    // for (let i = 0; i < numTicks; ++i) {
    //   simulation.tick();
    // }

    // Stop the simulation from automatically running
    // simulation.stop();

    // Draw lines for the links between the nodes
    const link = svg.append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", d => isStrongestPair(d) ? "darkgreen" : "#bbb")
      .attr("stroke-width", d => isStrongestPair(d) ? strokeWidth(d) : strokeWidth(d));


    // ...

    // Draw circles for the nodes with increased radius
    const node = svg.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", d => d.id === strongestPlayer ? nodeRadius + 8 : nodeRadius)
      .attr("fill", d => playerColors[d.group])
      .attr("stroke-width", d => d.id === strongestPlayer ? 8 : 2)
      .attr("stroke", d => d.id === strongestPlayer ? "gold" : "#2c3e50")
      .call(drag(simulation));
    // .transition().duration(1000);

    // Add labels to the nodes
    const labels = svg.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text(d => d.id)
      .attr('x', d => d.x)
      .attr('y', d => d.y + 1)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', d => getContrastYIQ(playerColors[d.group]))
      .style('font-size', getFontSize)
      .style('font-weight', 'bold');

    // Update and restart the simulation when nodes change
    simulation.on("tick", () => {
      // customCenterForce();

      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y); // Adjust label position based on node size
    });

    // Drag functionality
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
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default PlayerGraph;
