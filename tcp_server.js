const net = require('net');
const WebSocket = require('ws');

// Configuration
const TCP_PORT = 8080;
const WS_PORT = 9000;

// Maps to store client states
const clientMessageCounts = new Map(); // For tracking message counts
const wsClients = new Map();          // To map app names (e.g., app1, app2) to WebSocket clients

// Create a TCP server
const tcpServer = net.createServer((socket) => {
    const clientKey = `${socket.remoteAddress}:${socket.remotePort}`;
    //console.log(`TCP Client connected: ${clientKey}`);

    // Initialize message count for this client
    clientMessageCounts.set(clientKey, 0);

    // Handle data from the TCP client
    socket.on('data', (data) => {
      //  console.log(`Received from TCP client ${clientKey}:`, data.toString());
    
        try { 
            // Split the data by delimiter (e.g., '\n') to handle multiple concatenated messages
            const messages = data.toString().split('\n').filter(msg => msg.trim() !== '');
    
            // Process each message individually
            messages.forEach((message) => {
                try {
                    // Parse each message as JSON
                    const tcpMessage = JSON.parse(message);
                    const { targetApp, payload } = tcpMessage;
    
                    // Forward the message to the appropriate WebSocket client
                    const wsClient = wsClients.get(targetApp);
                    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
                        wsClient.send(JSON.stringify(payload));
                        //console.log(`Forwarded message to ${targetApp} via WebSocket.`);
                    } else {
                       // console.warn(`No active WebSocket client found for ${targetApp}.`);
                    }
                } catch (innerErr) {
                    console.error('Error parsing individual TCP message:', innerErr.message);
                }
            });
        } catch (outerErr) {
            console.error('Error handling TCP data:', outerErr.message);
        }
    });
    

    // Handle TCP client disconnection
    socket.on('end', () => {
        //console.log(`TCP Client disconnected: ${clientKey}`);
        clientMessageCounts.delete(clientKey);
    });

    // Handle TCP errors
    socket.on('error', (err) => {
        console.error(`Error with TCP client ${clientKey}:`, err.message);
    });
});

// Start the TCP server
tcpServer.listen(TCP_PORT, () => {
    //console.log(`TCP server running on port ${TCP_PORT}`);
});

// Create a WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT }, () => {
    //console.log(`WebSocket server running on port ${WS_PORT}`);
});

wss.on('connection', (ws, req) => {
    // Extract the app name from the query string (e.g., ws://localhost:9000?app=app1)
    const params = new URLSearchParams(req.url.split('?')[1]);
    const appName = params.get('app'); // Example: app1, app2, etc.

    if (appName) {
        //console.log(`WebSocket client connected for app: ${appName}`);
        wsClients.set(appName, ws); // Store the WebSocket client by app name
        // Handle messages from the WebSocket client
        ws.on('message', (message) => {
            // Convert the message to a string, even if it's received as a Buffer
           // console.log(message)
            const messageString = message.toString();

           // console.log(`Received from WebSocket client (${appName}):`, messageString);
        
            try {
                const parsedMessage = JSON.parse(messageString);
                const { targetApp, payload } = parsedMessage;
        
                // Forward the message to the TCP server
                const tcpClient = net.createConnection({ port: TCP_PORT }, () => {
                    const tcpMessage = JSON.stringify({ targetApp, payload });
                    tcpClient.write(tcpMessage);
                    //console.log(`Forwarded message to TCP server: ${tcpMessage}`);
                });
        
                // Handle TCP response
                tcpClient.on('data', (tcpData) => {
                    //console.log('Received from TCP server:', tcpData.toString());
        
                    // Forward the TCP server's response to the target WebSocket client
                    const wsClient = wsClients.get(targetApp);
                    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
                        wsClient.send(`From TCP Server: ${tcpData.toString()}`);
                        //console.log(`Forwarded TCP response to ${targetApp} via WebSocket.`);
                    }
        
                    tcpClient.end(); // Close the TCP connection after the response
                });
        
                tcpClient.on('error', (err) => {
                  //  console.error('TCP Client error:', err.message);
                });
            } catch (err) {
                console.error(`Invalid message from WebSocket client (${appName}):`, err.message);
            }
        });
        

        // Handle WebSocket disconnection
        ws.on('close', () => {
            //console.log(`WebSocket client disconnected for app: ${appName}`);
            wsClients.delete(appName); // Remove the client from the map
        });

        // Handle WebSocket errors
        ws.on('error', (err) => {
            console.error(`WebSocket error for app ${appName}:`, err.message);
        });
    } else {
        console.warn('WebSocket client connected without specifying an app name.');
        ws.close();
    }
});
