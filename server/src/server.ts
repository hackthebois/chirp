import * as dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import { clerkPlugin } from "@clerk/fastify";
import channelRoutes from "./routes/channel.route";
import messageRoutes from "./routes/message.route";
import cors from "@fastify/cors";
import FastifyWebsocket from "@fastify/websocket";

const fastify = Fastify({ logger: true });

fastify.get("/", (req, res) => {
    res.send("MADE IT");
});

const start = async () => {
    try {
        await fastify.register(clerkPlugin);
        await fastify.register(cors, {
            origin: "*",
            allowedHeaders: ["Authorization", "Content-Type"],
        });
        await fastify.register(FastifyWebsocket);

        await fastify.register(channelRoutes);
        await fastify.register(messageRoutes);
        await fastify.listen({ port: Number(process.env.PORT) || 8000 });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
