import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getContrastYIQ } from '../utils';
import * as Constants from '../constants';

const RADIUS = 40;

const getNodeX = (d, numNodes, width) => {
  const spaceBetween = Math.random() * 10 + 40
  const x = (d.id * spaceBetween) + ((width + spaceBetween / 2) / 2 - (numNodes * spaceBetween / 2));
  // console.log(`Position for player ${d.id}: ${position}`); // Log the position for debugging
  return x;
}

const getFontSize = (d) => {
  const size = 26 - d.name.length;
  return size + 'px';
}

const getSpace = (d) => {
  return Math.random() * .7 + 1.1;
}

const PlayerJoinGraph = ({ players, width, height }) => {

  // const canvasRef = useRef(null);
  const svgRef = useRef();
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      const positionedPlayers = players.map(p => ({
        ...p,
        x: width / 2,
        y: height / 2
      }))
      setNodes(positionedPlayers);
    } else if (players.length < nodes.length) {
      const newNodes = nodes.filter(n => players.find(p => p.name === n.name) !== undefined);
      setNodes(newNodes);
    } else {
      let newNodes = [];
      for (let player of players) {
        if (!nodes.find(n => n.name === player.name)) {
          const newNode = players[player.id];
          newNode.x = width / 2;
          newNode.y = height / 2;
          newNodes.push(newNode);
        }
      }

      setNodes([...nodes, ...newNodes]);
    }
  }, [players]);


  useEffect(() => {
    if (nodes.length === 0) return;

    const svg = d3.select(svgRef.current);

    const simulation = d3.forceSimulation(nodes)
      .force("x", d3.forceX((d) => getNodeX(d, players.length, width)).strength(0.2))
      .force("y", d3.forceY(height / 2).strength(0.2))
      .force("collide", d3.forceCollide((d) => RADIUS * getSpace(d)))
      .alpha(1)
      .alphaDecay(0.01)
      .velocityDecay(0.5);

    simulation.on('tick', () => {

      svg.selectAll('circle')
        .data(nodes)
        .join(
          enter => enter.append('circle')
            .attr('r', 0) // start with radius 0
            .attr('fill', d => Constants.playerColors[d.id])
            .attr("stroke-width", d => d.id === 0 ? 4 : 2)
            .attr("stroke", d => d.id === 0 ? "gold" : "rgb(107,114,128)")
            // .transition() // begin a transition
            // .duration(300) // duration of 500ms
            .attr('r', RADIUS), // transition to the actual radius
          update => update,
          exit => exit.remove()
        )
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      svg.selectAll('text')
        .data(nodes)
        .join(
          enter => enter.append('text')
            .style('fill-opacity', 0)
            .text(d => d.name)
            // .transition()
            // .duration(300)
            .style('fill-opacity', 1),
          update => update,
          exit => exit.remove()
        )
        .attr('x', d => d.x)
        .attr('y', d => d.y + 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('fill', d => getContrastYIQ(Constants.playerColors[d.id]))
        .style('font-size', getFontSize)
        .style('font-weight', 'bold');
    });

  }, [width, height, nodes]);

  return (
    <svg ref={svgRef} width={width} height={height} />
  );
};

export default PlayerJoinGraph;