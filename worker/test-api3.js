async function main() {
  const token = "mock-token-123";

  const res = await fetch("https://rethink.buleegasy.space/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      messages: [{role: "user", content: "hello"}],
      stream: false,
      sessionId: "test-session"
    })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}
main();
