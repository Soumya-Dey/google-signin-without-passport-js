const app = require("express")();
const axios = require("axios");
const queryString = require("query-string");

const env = require("./env");

app.get("/", (req, res) => res.send("Hello from localhost:3000"));

app.get("/login/google", (req, res) => {
  const stringifiedParams = queryString.stringify({
    client_id: env.CLIENT_ID,
    redirect_uri: "http://localhost:3000/auth/google",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" "), // space seperated string
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
  });

  const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${stringifiedParams}`;

  res.redirect(googleLoginUrl);
});

app.get("/auth/google", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code)
      return res
        .status(400)
        .json({ errors: [{ msg: "No code found in url" }] });

    const { data: tokenData } = await axios({
      url: `https://oauth2.googleapis.com/token`,
      method: "post",
      data: {
        client_id: env.CLIENT_ID,
        client_secret: env.CLIENT_SECRET,
        redirect_uri: "http://localhost:3000/auth/google",
        grant_type: "authorization_code",
        code,
      },
    });

    const token = tokenData.access_token;

    if (!token)
      return res
        .status(400)
        .json({ errors: [{ msg: "Problem fetching access token" }] });

    const { data: userInfo } = await axios({
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
      method: "get",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userInfo)
      return res
        .status(400)
        .json({ errors: [{ msg: "No google user found" }] });

    res.json(userInfo);
  } catch (error) {
    res
      .status(500)
      .json({ errors: [{ msg: `Server error: ${error.message}` }] });
  }
});

app.listen(3000, () =>
  console.log("server started at => http://localhost:3000/")
);
