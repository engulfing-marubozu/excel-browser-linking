import React, { useState, useEffect } from 'react';

const App = () => {
    const [messages, setMessages] = useState([]);
    const [ws, setWs] = useState(null);
    
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:9000?app=app2');
        setWs(socket);

        socket.onmessage = (event) => {
            if(messages.length>2000)
                setMessages([]);
            else
            setMessages((prev) => [ `Server: ${event.data}`,...prev]);
        };

        socket.onopen = () => {
            setMessages((prev) => [...prev, 'Connected to WebSocket server as app2.']);
        };

        socket.onclose = () => {
            setMessages((prev) => [...prev, 'Disconnected from WebSocket server.']);
        };

        socket.onerror = (error) => {
            setMessages((prev) => [...prev, `WebSocket error: ${error.message}`]);
        };

        return () => {
            socket.close();
        };
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h1>QAD App</h1>
            <div
    style={{
        backgroundColor:'grey',
      height: '800px', // Set a fixed height for the scrollable area
      overflowY: 'auto',  // Enable vertical scrolling when overflowing
      width: '100%',      // Ensure it takes the full width
      color:'white',
      maxHeight: '800px'
    }}
  >
    {
      messages.map((update, index) => (
        <div style={{     display:'flex',
            flexDirection:'column',
            justifyContent:'center',
        textAlign:'center'}} key={index}>
         {update}
            </div>
      ))
    }
  </div>
        </div>
    );
};

export default App;
    // {`Row ${parseCellAddress(update.cellAddress).row} Column ${parseCellAddress(update.cellAddress).column}: Value ${update.cellValue}`}