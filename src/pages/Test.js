import React, { useEffect, useState } from "react";

import { db } from "../utils/Firebase";
import { collection, doc, addDoc, getDocs, onSnapshot, query } from "firebase/firestore";

const addGame = async (e) => {
  e.preventDefault();

  try {
    const docRef = await addDoc(collection(db, "games"), {
       name: "test",
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

function Test() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "games"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newGames = [];
      querySnapshot.forEach((doc) => {
        newGames.push(doc.data());
      });
      setGames(newGames);
    });
    // fetchGames();
  }, []);


  return (
    <>
      <div className="">
        {games.map((game, index) => (
          <div key={index} >{game.name}</div>
        ))}
      </div>
      <button onClick={addGame}>Add Game</button>
    </>
  );
}

export default Test;