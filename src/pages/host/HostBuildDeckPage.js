
import React, { useEffect } from 'react';
import Nav from '../../components/Nav';
import { displayFormattedDeckType, displayGameLength, displayWordSelection } from '../../utils';
import Toggle from '../../components/Toggle';
import PlayerJoinGraph from '../../components/PlayerJoinGraph';

const HostBuildDeckPage = ({ gameData, players }) => {

  const { shortId } = gameData;


  return (
    <div className="">
      <Nav className="max-w-screen-md" />
      Players building the deck...
    </div>
  );
};

export default HostBuildDeckPage;
