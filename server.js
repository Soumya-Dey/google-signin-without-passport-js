const app = require("express")();
const axios = require("axios");
const cors = require("cors");

const env = require("./env");

app.use(cors());

app.get("/", (req, res) => res.send("Hello from localhost:5000"));

app.get("/user/signin", async (req, res) => {
  try {
    const { code, method } = req.query;

    if (!code)
      return res
        .status(400)
        .json({ errors: [{ msg: "No code found in url" }] });

    let urlForData;
    let dataForToken;
    let reqMethod;
    let queryParams;
    if (method === "google") {
      urlForData = `https://oauth2.googleapis.com/token`;
      dataForToken = {
        client_id: env.CLIENT_ID,
        client_secret: env.CLIENT_SECRET,
        redirect_uri: "http://localhost:3000/auth/google",
        grant_type: "authorization_code",
        code,
      };
      reqMethod = "post";
    } else if (method === "facebook") {
      queryParams = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID,
        client_secret: env.FACEBOOK_APP_SECRET,
        redirect_uri: "http://localhost:3000/auth/facebook",
        code,
      }).toString();
      urlForData = `https://graph.facebook.com/v9.0/oauth/access_token?${queryParams}`;
      dataForToken = {};
      reqMethod = "get";
    }

    const { data: tokenData } = await axios({
      url: urlForData,
      method: reqMethod,
      data: dataForToken,
    });

    const token = tokenData.access_token;

    if (!token)
      return res
        .status(400)
        .json({ errors: [{ msg: "Problem fetching access token" }] });

    let headersForInfo;
    if (method === "google") {
      urlForData = `https://www.googleapis.com/oauth2/v2/userinfo`;
      headersForInfo = {
        Authorization: `Bearer ${token}`,
      };
    } else if (method === "facebook") {
      queryParams = new URLSearchParams({
        fields: ["id", "email", "first_name", "last_name"].join(","),
        access_token: token,
      }).toString();
      urlForData = `https://graph.facebook.com/me?${queryParams}`;
      headersForInfo = {};
    }

    const { data: userInfo } = await axios({
      url: urlForData,
      method: "get",
      headers: headersForInfo,
    });

    if (!userInfo)
      return res
        .status(400)
        .json({ errors: [{ msg: "No google user found" }] });

    res.json(userInfo);
  } catch (error) {
    res.status(500).json({ errors: [{ msg: `Server error: ${error}` }] });
  }
});

app.listen(5000, () =>
  console.log("server started at => http://localhost:5000/")
);
