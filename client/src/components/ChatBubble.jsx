export default function ChatBubble({ from, children }) {
  const isMine = from === "agent";
  return (
    <div className={`bubble-row ${isMine ? "mine" : ""}`}>
      <div className={`bubble ${isMine ? "mine" : "ai"}`}>
        {!isMine && <b>SpotShield AI: </b>}
        {children}
      </div>
    </div>
  );
}
