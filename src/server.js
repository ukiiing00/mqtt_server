import express from 'express';
import http from 'http';
import { WebSocket } from 'ws';
import mqtt from 'mqtt';

const protocol = 'mqtt';
const host = 'broker.emqx.io';
const port = '1883';
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
const connectUrl = `${protocol}://${host}:${port}`;

const app = express();

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/public', express.static(__dirname + '/public'));
app.get('/', (_, res) => res.render('home'));
app.get('/*', (_, res) => res.redirect('/'));

const handleListen = () => console.log(`Listening on http://localhost:4000`);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'emqx',
    password: 'public',
    reconnectPeriod: 1000,
});

const topic = '/nodejs/mqtt/*';

client.on('connect', () => {
    console.log('Connected');
    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`);
    });
    client.publish(
        topic,
        'nodejs mqtt test',
        { qos: 2, retain: false },
        (error) => {
            if (error) {
                console.error(error);
            }
        }
    );
});

client.on('message', (topic, payload) => {
    console.log('Received Message:', topic, payload);
});

function onSocketClose() {
    console.log('Disconnected from the Browser ❌');
}

const sockets = [];

wss.on('connection', (socket) => {
    console.log('Connected to Browser ✅');
    socket.on('message', (msg) => {
        const message = JSON.parse(msg);
        console.log(message);
        client.publish(topic, msg, { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(error);
            }
        });
        switch (message.type) {
            case 'new_message':
                sockets.forEach((aSocket) =>
                    aSocket.send(`${socket.nickname}: ${message.payload}`)
                );
            case 'nickname':
                socket.nickname = message.payload;
        }
    });
});

server.listen(4000, handleListen);
