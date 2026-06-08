import { SignJWT } from 'jose';

async function main() {
  const secretKey = "0x4AAAAAADgdD_ejrxz30SEOsNvp_lcJkvc";
  const secret = new TextEncoder().encode(secretKey);
  const token = await new SignJWT({ uid: 'test-user', username: 'test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2h')
    .sign(secret);

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
