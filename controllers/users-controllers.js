const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const User = require('../models/user');


const getUsers = async(req, res, next) => {
  let users;
  try {
    users = await User.find({},"-password");
  } catch (err) {
    const error = new HttpError("Users Feteching Failed",500);
    next(error);
  }
  res.json({ users: users.map(user=> user.toObject({getters:true})) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }
  const { name, email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({email:email});
  } catch (error) {
    const err = new HttpError("Signing Up Failed, Please try again later ",500);
    next(err);
  }

  if(existingUser){
    const error = new HttpError("User Exits Already , Please Login Instead ",500);
    return next(error);
  }




  const createdUser = new User({  
    name,
    email,
    password,
    image:"https://media.istockphoto.com/photos/man-enjoying-the-view-from-top-of-mountain-picture-id906360442?s=612x612",
    places:[]
  });

  try{
    await  createdUser.save();
  }catch (err) {
    const error = new HttpError('Signing Up falied',500);
    return next(error);
  }
  

  res.status(201).json({user: createdUser.toObject({getters:true})});
};

const login =  async(req, res, next) => {
  const { email, password } = req.body;
  let existingUser;

  try {
    existingUser = await User.findOne({email:email});
  } catch (error) {
    const err = new HttpError("Loging In Failed, Please try again later ",500);
    next(err);
  }

  if(!existingUser || existingUser.password !== password){
    const error = new HttpError("Invalid Credentials",500);
    return next(error);
  }
  res.status(201).json({user: existingUser.toObject({getters:true})});
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
