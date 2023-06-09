import { FastifyRequest, FastifyReply, RequestGenericInterface } from "fastify";
import { SocketStream } from "@fastify/websocket";
import { db } from "../db/db";
import { messages } from "../db/schema";
import { eq } from "drizzle-orm/expressions";

export interface requestID extends RequestGenericInterface {
    Params: {
        id: string;
    };
}

const channelRooms: Record<string, Set<SocketStream>> = {};

export const getChannelMessages = async (req: FastifyRequest<requestID>, res: FastifyReply) => {
    const { id } = req.params;

    if (!req.user!.privateMetadata.channelIds.includes(id))
        res.status(400).send("You Do not have Access to this Channel");
    else res.send(await db.select().from(messages).where(eq(messages.channelId, id)));
};

export const liveChat = (connection: SocketStream, req: FastifyRequest<requestID>) => {
    const { id } = req.params;

    if (!req.user!.privateMetadata.channelIds.includes(id)) {
        console.log("You Do not have Access to this Channel");
        return;
    }

    if (!channelRooms[id]) channelRooms[id] = new Set();

    channelRooms[id].add(connection);

    // Client connect
    console.dir(`Client connected: ${req.user!.emailAddresses[0].emailAddress}`);
    // Client message
    connection.socket.on("message", (message: unknown) => {
        // Handle incoming messages from the WebSocket connection
        // You can process the messages or broadcast them to other clients in the same room
        channelRooms[id].forEach((socket) => {
            socket.socket.send(`Room ${id}:	${req.user!.emailAddresses[0].emailAddress}: ${message}`);
        });
    });

    connection.socket.on("close", () => {
        // Handle WebSocket connection close event
        // Clean up any resources or update application state
        console.dir(`Client Disconnected: ${id}`);
        channelRooms[id].delete(connection);

        // If the room becomes empty, you can remove it from the rooms object
        if (channelRooms[id].size === 0) {
            delete channelRooms[id];
        }
    });
};

export default {
    liveChat,
};
