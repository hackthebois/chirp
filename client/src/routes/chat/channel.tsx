import { useUser } from "@clerk/clerk-react";
import { Form, Field } from "houseform";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaSmileBeam } from "react-icons/fa";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import dayjs from "dayjs";
dayjs.extend(isToday);
dayjs.extend(isYesterday);
import React from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getChannel } from "../../utils/channel";
import useOnClickOutside from "../../hooks/useOnClickOutside";

const MessageSchema = z.object({
	user: z.object({
		id: z.string(),
		image: z.string(),
		fullName: z.string(),
	}),
	text: z.string().min(1),
	createdAt: z.date(),
});

type MessageType = z.infer<typeof MessageSchema>;

const formatTime = (date: Date) => {
	const djs = dayjs(date);

	if (djs.isToday()) return `Today at ${djs.format("h:mm A")}`;

	if (djs.isYesterday()) return `Yesterday at ${djs.format("h:mm A")}`;

	return djs.format("MMM D, YYYY");
};

const Message = ({ message }: { message: MessageType }) => {
	const currentUser = (Math.random() * 10) % 2 === 0;

	return (
		<>
			<p className="mb-2">
				<span className="mr-2 text-sm font-bold text-slate-200 sm:text-base">
					{message.user.fullName}
				</span>
				<span className="text-xs text-slate-400 sm:text-sm">
					{formatTime(message.createdAt)}
				</span>
			</p>
			<div
				className={`flex h-14 items-center rounded-2xl px-4 py-3 shadow-xl ${
					currentUser ? "bg-blue-600" : "bg-zinc-800"
				}`}
			>
				<div className="mr-3 h-8 w-8">
					<img src={message.user.image} className="rounded-full" />
				</div>
				{message.text}
			</div>
		</>
	);
};

const Channel = () => {
	const { channelId } = useParams({ from: "/chat/$channelId" });
	const { data: channel } = useQuery({
		queryFn: () => getChannel(channelId),
		queryKey: ["channel", channelId],
	});
	const ref = useRef<HTMLDivElement | null>(null);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const { user } = useUser();
	const [messages, setMessages] = useState<MessageType[]>([]);
	if (!user) return null;
	const scrollRef = useRef<HTMLDivElement | null>(null);
	useOnClickOutside(ref, () => setShowEmojiPicker(false));

	const scrollToBottom = useCallback(() => {
		scrollRef.current?.scrollIntoView();
	}, [scrollRef]);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	return (
		<div className="flex flex-1 flex-col justify-end overflow-y-auto">
			<div className="mt-4 flex flex-col items-start overflow-y-auto px-4 scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-700 scrollbar-track-rounded scrollbar-thumb-rounded">
				{messages.map((message, index) => (
					<div
						className={`flex flex-col items-start ${
							index === messages.length - 1 ? "" : "pb-4"
						}`}
					>
						<Message key={index} message={message} />
					</div>
				))}
				<div ref={scrollRef} />
			</div>
			<Form
				onSubmit={(data) => {
					setMessages([
						...messages,
						{
							user: {
								id: user.id,
								image: user.profileImageUrl,
								fullName: user.fullName || user.username || "",
							},
							text: data.message,
							createdAt: new Date(),
						},
					]);
				}}
			>
				{({ submit }) => (
					<div className="p-4">
						<div
							className="relative flex h-14 min-h-[56px] w-full items-center rounded-2xl bg-zinc-800 px-4 pr-2 shadow-xl"
							ref={ref}
						>
							<Field
								name="message"
								initialValue={""}
								onChangeValidate={z.string().min(1)}
							>
								{({ value, setValue, onBlur }) => (
									<>
										<input
											value={value}
											onChange={(e) =>
												setValue(e.target.value)
											}
											onBlur={onBlur}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													submit()
														.then(() =>
															setValue("")
														)
														.catch((e) => {
															console.error(e);
														});
												}
											}}
											placeholder="Type a message..."
											className="flex-1 bg-zinc-800 outline-none"
										/>
										{showEmojiPicker && (
											<div className="absolute bottom-16 right-0">
												<Picker
													data={data}
													onEmojiSelect={(
														emoji: any
													) => {
														setValue(
															`${value}${emoji.native}`
														);
													}}
													theme="dark"
												/>
											</div>
										)}
										<button
											className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-700"
											onClick={() =>
												setShowEmojiPicker(
													!showEmojiPicker
												)
											}
										>
											<FaSmileBeam size={22} />
										</button>
									</>
								)}
							</Field>
						</div>
					</div>
				)}
			</Form>
		</div>
	);
};

export default Channel;
