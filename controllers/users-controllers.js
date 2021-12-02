const { validationResult } = require("express-validator");
const bcrpyt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUsers = async (req, res, next) => {
    let users;
    try {
        users = await User.find({}, "-password");
    } catch (err) {
        const error = new HttpError("Users Feteching Failed", 500);
        next(error);
    }
    res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new HttpError("Invalid inputs passed, please check your data.", 422)
        );
    }
    const { name, email, password } = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({ email: email });
    } catch (error) {
        const err = new HttpError(
            "Signing Up Failed, Please try again later ",
            500
        );
        next(err);
    }

    if (existingUser) {
        const error = new HttpError(
            "User Exits Already , Please Login Instead ",
            500
        );
        return next(error);
    }

    let hashPassword;

    try {
        hashPassword = await bcrpyt.hash(password, 12);
    } catch (error) {
        const err = new HttpError(
            "Signing Up Failed, Please try again later ",
            500
        );
        next(err);
    }

    const createdUser = new User({
        name,
        email,
        password: hashPassword,
        image: req.file.path,
        places: [],
    });

    try {
        await createdUser.save();
    } catch (err) {
        const error = new HttpError("Signing Up falied", 500);
        return next(error);
    }

    let token;

    try {
        token = jwt.sign(
            { userId: createdUser.id, email: createdUser.email },
            process.env.JWT_KEY,
            { expiresIn: "1h" }
        );
    } catch (err) {
        const error = new HttpError("Signing Up falied", 500);
        return next(error);
    }

    res.status(201).json({
        userId: createdUser.id,
        email: createdUser.email,
        token: token,
    });
};

const login = async (req, res, next) => {
    const { email, password } = req.body;
    let existingUser;

    try {
        existingUser = await User.findOne({ email: email });
    } catch (error) {
        const err = new HttpError(
            "Loging In Failed, Please try again later ",
            500
        );
        next(err);
    }

    if (!existingUser) {
        const error = new HttpError("Invalid Credentials", 403);
        return next(error);
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrpyt.compare(password, existingUser.password);
    } catch (error) {
        const err = new HttpError(
            "Loging In Failed , Invalid Credentials, Please try again later ",
            500
        );
        next(err);
    }

    if (!isValidPassword) {
        const error = new HttpError("Invalid Credentials", 403);
        return next(error);
    }

    let token;

    try {
        token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email },
            process.env.JWT_KEY,
            { expiresIn: "1h" }
        );
    } catch (err) {
        const error = new HttpError("Loging In falied", 500);
        return next(error);
    }
    res.status(201).json({
        userId: existingUser.id,
        email: existingUser.email,
        token: token,
    });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
