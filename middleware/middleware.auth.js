import jwt from "jsonwebtoken";

let auth = async (req, res, next) => {
  let header = req.headers.authorization; // await olib tashlandi

  if (!header) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    let token = header.split(" ")[1]; // await olib tashlandi
    let decode = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decode;
    next();
  } catch (err) {
    console.log(err.message);
    // Token xato yoki eskirgan bo'lsa frontendga srazi xabar beramiz:
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export default auth;
