const PlayerConnectionsTable = ({ playersData, averageScore, strongestPlayer, strongestPair }) => {
  // Sort players by gameScore in descending order
  const sortedPlayers = [...playersData].sort((a, b) => b.gameScore - a.gameScore);

  return (
    <div className="overflow-x-auto text-lg rounded-lg">
      <table className="min-w-full bg-gray-800">
        <thead>
          <tr className="text-left text-gray-100">
            <th className="py-2 px-4">Player</th>
            <th className="py-2 px-4">Score</th>
            <th className="py-2 px-4">Connections</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player) => (
            <tr key={player.name} 
              className={`${player.name === strongestPlayer ? 'border border-4 border-yellow-400' : 'border-b border-gray-700'}
                ${player.name === strongestPair.source || player.name === strongestPair.target ? 'bg-green-800' : ''}`}>
              <td className={`px-4 py-2 text-gray-100`}>{player.name}</td>
              <td className="px-4 py-2 text-gray-100">{player.gameScore}</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(player.connections)
                    .filter(([name, score]) => score > 0)
                    .sort((a, b) => b[1] - a[1]) // Sort connections by score
                    .map(([name, score]) => (
                      <span key={name} className={`${score > averageScore ? 'text-gray-100' : 'text-gray-500'} text-sm bg-gray-700 rounded px-2`}>
                        {`${name}: ${score}`}
                      </span>
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerConnectionsTable;
