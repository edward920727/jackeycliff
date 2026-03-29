import MonopolyGame from '@/components/monopoly/MonopolyGame'

export default async function MonopolyRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  return <MonopolyGame roomId={roomId} />
}

