import React, { useState, useEffect, useRef } from "react";

const Grid = () => {
  const [gridData, setGridData] = useState(
    Array.from({ length: 18 }, () => Array(3).fill("")) // 20x3 grid with empty strings
  );
  const [linkBuffer, setLinkBuffer] = useState(""); // Holds the latest linked cell address
  const [linkedCells, setLinkedCells] = useState({}); // Map of cellAddress to { row, col }
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, row: null, col: null });
  const [threshold, setThreshold] = useState(6000); // State for the dynamic threshold
  const base = 96;
  const laserActive = useRef(null);
  const [laserValue, setLaserValue] = useState('');
  const [updates, setUpdates] = useState([]);
  function isNumber(value) {
    return !isNaN(value) && !isNaN(parseFloat(value));
  }
  useEffect(() => {
    // WebSocket setup
    const socket = new WebSocket("ws://localhost:9000?app=NG");

    socket.onopen = () => {
      //console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      //console.log(event.data);
      const data = JSON.parse(event.data);
      if (data.cellValue === "10000000") {
        // Setting linkBuffer if cellValue is 10000000
        //console.log("Setting link");
        setLinkBuffer(data.cellAddress);
        console.log(data.cellAddress)
      } else if (isNumber(data.cellValue) && data.cellValue < 100000 && data.cellValue != 0) {
        if (data.cellValue > threshold) { // Use the dynamic threshold here
          socket.send(JSON.stringify({ targetApp: "app2", payload: event.data }));
        }
        if(updates.length>20000)
            setUpdates([]);
        else
        setUpdates((prevUpdates) => [data, ...prevUpdates]);
        // Check if the cellAddress is linked
        if (linkedCells[data.cellAddress]) {
          const { row, col } = linkedCells[data.cellAddress];
          setGridData((prev) => {
            const updatedGrid = [...prev];
            updatedGrid[row][col] = data.cellValue; // Update the grid data
            return updatedGrid;
          });
        } else if (data.cellAddress == laserActive.current) {
          //console.log("came here");
          setLaserValue(data.cellValue);
        }
      }
    };

    socket.onclose = () => {
      //console.log("WebSocket connection closed");
    };

    return () => {
      socket.close(); // Cleanup WebSocket on component unmount
    };
  }, [linkedCells, threshold]);

  const handleRightClick = (row, col, e) => {
    e.preventDefault(); // Prevent the default right-click menu
    setContextMenu({ visible: true, x: e.pageX-350, y: e.pageY-100, row, col }); // Set context menu position
  };

  const handleLink = () => {
    if (linkBuffer) {
      if (contextMenu.col != 1) {
        setLinkedCells((prev) => ({
          ...prev,
          [linkBuffer]: { row: contextMenu.row, col: contextMenu.col },
        }));
      } else {
        //console.log(linkBuffer);
        laserActive.current = linkBuffer;
      }
      //console.log(`Linked cell ${linkBuffer} to grid position [${contextMenu.row}, ${contextMenu.col}]`);
      setLinkBuffer(""); // Clear the link buffer
    }
    setContextMenu({ visible: false, x: 0, y: 0, row: null, col: null }); // Hide context menu
  };

  const handleUnlink = () => {
    const cellAddress = Object.keys(linkedCells).find(
      (key) =>
        linkedCells[key].row === contextMenu.row && linkedCells[key].col === contextMenu.col
    );

    if (cellAddress) {
      setLinkedCells((prev) => {
        const updatedLinks = { ...prev };
        delete updatedLinks[cellAddress]; // Remove the link
        return updatedLinks;
      });
      //console.log(`Unlinked cell at grid position [${contextMenu.row}, ${contextMenu.col}]`);
    }

    setContextMenu({ visible: false, x: 0, y: 0, row: null, col: null }); // Hide context menu
  };

  const handleClickOutside = () => {
    setContextMenu({ visible: false, x: 0, y: 0, row: null, col: null }); // Hide context menu on outside click
  };

  function parseCellAddress(cellAddress) {
    const match = /^\$([A-Z]+)\$(\d+)$/.exec(cellAddress);
    if (!match) {
      throw new Error("Invalid cell address format");
    }

    const [, column, row] = match; // Destructure the matched groups
    return { row, column };
  }

  const isCellLinked = (row, col) => {
    if (col != 1 && Object.values(linkedCells).some((linkedCell) => linkedCell.row === row && linkedCell.col === col))
      return "#3399ff";
    if (col == 1 && base + (row * 0.005) == laserValue)
      return "#ff1a1a";
    else
      return "white";
  };
  const handleThresholdChange = (e) => {
    const newThreshold = parseInt(e.target.value, 10);
    if (!isNaN(newThreshold)) {
      setThreshold(newThreshold);
    }
  };
  return (
    <div>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'lightgrey' }}>
  {/* Left Aligned Text */}
  <div style={{ fontWeight: 'bold', fontSize: '20px', marginLeft: '10px' }}>
    NEXTGEN
  </div>
  
  {/* Center Aligned Label and Input */}
  <div style={{ textAlign: 'center' }}>
    <label htmlFor="threshold">Set Threshold to send to QAD app: </label>
    <input
      type="number"
      id="threshold"
      value={threshold}
      onChange={handleThresholdChange}
      style={{ padding: '5px', width: '80px', marginLeft: '5px' }}
    />
  </div>
</div>

      <div style={{ display: 'flex', height: '500px' }}>
      <div style={{ width: '50%', backgroundColor: 'grey', display: 'flex', justifyContent: "center", alignItems: "center" }}>
        <div onClick={handleClickOutside} style={{ position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 60px)" }}>
            {gridData.map((rowData, row) =>
              rowData.map((cellValue, col) => (
                <div
                  key={`${row}-${col}`}
                  onContextMenu={(e) => handleRightClick(row, col, e)}
                  style={{
                    border: "1px solid black",
                    padding: "2px",
                    textAlign: "center",
                    cursor: "context-menu",
                    height: "17px",
                    fontSize: '14px',
                    backgroundColor: isCellLinked(row, col), // Set background color
                    color: isCellLinked(row, col) === "white" ? "black" : "white", // Adjust text color for contrast
                  }}
                >
                  {col == 1 ? base + (row * 0.005) : cellValue}
                </div>
              ))
            )}
          </div>
          {contextMenu.visible && (
            <div
              style={{
                position: "absolute",
                top: contextMenu.y,
                left: contextMenu.x,
                backgroundColor: "white",
                border: "1px solid gray",
                boxShadow: "0px 2px 5px rgba(0,0,0,0.2)",
                zIndex: 10,
              }}
            >
              <div
                onClick={handleLink}
                style={{ padding: "5px 10px", cursor: "pointer" }}
              >
                Link
              </div>
              <div
                onClick={handleUnlink}
                style={{ padding: "5px 10px", cursor: "pointer" }}
              >
                Unlink
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          width: '50%',
          backgroundColor: 'grey',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '50px',
        }}
      >
        <div
          style={{
            backgroundColor: '#3399ff',
            height: '400px', // Set a fixed height for the scrollable area
            overflowY: 'auto',  // Enable vertical scrolling when overflowing
            width: '100%',      // Ensure it takes the full width
            color: 'white',
            maxHeight: '400px'
          }}
        >
          {
            updates.map((update, index) => (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                textAlign: 'center'
              }} key={index}>{`Row ${parseCellAddress(update.cellAddress).row} Column ${parseCellAddress(update.cellAddress).column}: Value ${update.cellValue}`}</div>
            ))
          }
        </div>
      </div>
    </div>
    </div>

  );
};

export default Grid;
