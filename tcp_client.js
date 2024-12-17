const net = require('net');
const readline = require('readline');

// Configuration for the TCP server
const HOST = '127.0.0.1'; // Server's IP
const PORT = 8080;        // Server's Port

// Create a TCP client
const client = new net.Socket();

// Create an interface for reading user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Connect to the TCP server
client.connect(PORT, HOST, () => {
    console.log(`Connected to server at ${HOST}:${PORT}`);
    console.log('Type a message and press Enter to send it to the server.');
});

// Listen for data from the server
client.on('data', (data) => {
    console.log('Received from server:', data.toString());
});

// Handle connection close
client.on('close', () => {
    console.log('Connection closed');
    rl.close(); // Close the input stream
});

// Handle errors
client.on('error', (err) => {
    console.error('Error:', err.message);
});

// Read input from the user and send it to the server
rl.on('line', (input) => {
    client.write(input);
});
