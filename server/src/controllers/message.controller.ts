/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SocketStream } from "@fastify/websocket";
import { desc, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest, RequestGenericInterface } from "fastify";
import { v4 as uuid } from "uuid";
import { db } from "../db/db";
import { Message, NewMessage, messages } from "../db/schema";

export interface requestID extends RequestGenericInterface {
    Params: {
        id: string;
    };
}

const channelRooms: Record<string, Set<SocketStream>> = {};

export const getChannelMessages = async (req: FastifyRequest<requestID>, res: FastifyReply) => {
    const { id } = req.params;

    if (!req.user!.privateMetadata.channelIds.includes(id)) {
        res.status(400).send("You Do not have Access to this Channel");
    }

    const messageData: Message[] = await db
        .select()
        .from(messages)
        .where(eq(messages.channelId, id))
        .orderBy(desc(messages.createdAt));

    res.send(messageData);
};

const updateChannelMessages = async (messageParams: NewMessage) => {
    await db.insert(messages).values(messageParams);
};

export const liveChat = (connection: SocketStream, req: FastifyRequest<requestID>) => {
    const { id } = req.params;

    if (!req.user!.privateMetadata.channelIds.includes(id)) {
        return;
    }

    if (!channelRooms[id]) channelRooms[id] = new Set();

    channelRooms[id].add(connection);

    // Client connect
    console.dir(`Client connected: ${req.user!.emailAddresses[0].emailAddress}`);

    connection.socket.on("message", (message: unknown) => {
        // Handle incoming messages from the WebSocket connection
        // broadcast the messages to other clients in the same channel
        const messageParams = {
            id: uuid(),
            userId: req.user!.id,
            username: `${req.user!.firstName ?? ""} ${req.user!.lastName ?? ""}`,
            profileImage: req.user!.imageUrl ?? "",
            channelId: id,
            message: `${message}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        channelRooms[id].forEach((socket) => {
            socket.socket.send(
                JSON.stringify({
                    ...messageParams,
                })
            );
        });

        updateChannelMessages(messageParams);
    });

    connection.socket.on("close", () => {
        // Handle WebSocket connection close event
        // Clean up any resources or update application state
        console.dir(`Client Disconnected: ${req.user!.username}`);
        channelRooms[id].delete(connection);

        // If the room becomes empty, remove it from the rooms object
        if (channelRooms[id].size === 0) {
            delete channelRooms[id];
        }
    });
};

export default {
    liveChat,
};
