// In-memory store — extend with your domain types

export type User = {
  id: string;
  name: string;
  joinedAt: Date;
};

export type Note = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date;
};

export type AppState = {
  users: Map<string, User>;
  notes: Note[];
};

const state: AppState = {
  users: new Map(),
  notes: [],
};

export default state;
