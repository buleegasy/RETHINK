async function main() {
  const res = await fetch("https://rethink.buleegasy.space/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "testuser",
      password: "testpassword",
      turnstileToken: "mock-token"
    })
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}
main();
