import React from 'react'
import { ItemTypes } from '../constants/Constants'
import { useDrag } from 'react-dnd'
import { cards } from '../utils/utils'

function PlayerCard({cardIndex}) {
  const [{isDragging}, drag] = useDrag(() => ({
    type: ItemTypes.KNIGHT,
    collect: monitor => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        fontSize: 25,
        fontWeight: 'bold',
        cursor: 'move',
        backgroundImage: `url(${cards[cardIndex]})`,
      }}
    >
      ♘
    </div>
  )
}

export default PlayerCard