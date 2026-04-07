export default function handler(_req: unknown, res: { status: (code: number) => { send: (body: string) => void } }) {
  return res.status(200).send("pong");
}
