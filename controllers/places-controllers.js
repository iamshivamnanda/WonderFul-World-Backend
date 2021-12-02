const uuid = require('uuid').v4;
const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const mongoose = require('mongoose');
const Place = require('../models/place');
const User = require('../models/user');
const fs = require('fs');



const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }
let place;
  try{
   place = await Place.findById(placeId).exec();
  }catch (err) {
    const error = new HttpError('Could not founf place',500);
    return next(error);
  }

  if (!place) {
    const error =  new HttpError('Could not find a place for the provided id.', 404);
    return next(error);
  }

  res.json({ place :place.toObject({getters:true} )}); // => { place } => { place: place }
};


const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let places;
  try{
    // places = Place.find({creator:userId}).exec();
   let  userr = await User.findById(userId);
     places = await User.findById(userId).populate('places');
   }catch (err) {
     const error = new HttpError('Could not found places',500);
     return next(error);
   }

  if (!places || places.places.length === 0) {
    return next(
      new HttpError('Could not find places for the provided user id.', 404)
    );
  }

  res.json({ places : places.places.map(place => place.toObject({getters:true})) });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  // const title = req.body.title;
  const createdPlace = new Place({
    title,
    description,
    address,
    location:coordinates,
    image:req.file.path,
    creator:req.userData.userId
  }) ;

// console.log(createdPlace.toJSON());
let user;
try{
 user =  await  User.findById(req.userData.userId);
//  console.log(user);

}catch (err) {
  const error = new HttpError('createdplace falied for user found',404);
  return next(error);
}

if(!user){
  const error = new HttpError('No User Found for provided Id ',404);
  return next(error);
}

try{
  const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess }); 
    user.places.push(createdPlace); 
    await user.save({ session: sess }); 
    await sess.commitTransaction();
  
}catch (err) {
  // console.log(err);
  const error = new HttpError('createdplace falieddddd in saveing',500);
  return next(error);
}

  // DUMMY_PLACES.push(createdPlace); //unshift(createdPlace)

  res.status(201).json({ place: createdPlace });
};

const updatePlace =  async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next( new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try{
    place = await Place.findById(placeId);
  }catch (err) {
    const error = new HttpError('updateplace falied',500);
    return next(error);
  }
  
  if(place.creator.toString() !== req.userData.userId){
    const error = new HttpError('You are Not allowed to edit this place ',401);
    return next(error);
  }
 
  place.title = title;
  place.description = description;

  try{
   await place.save();
  }catch (err) {
    const error = new HttpError('updateplace falied',500);
    return next(error);
  }

  res.status(200).json({ place: place.toObject({getters:true}) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try{
   place =  await Place.findById(placeId).populate('creator');
    
   }catch (err) {
     const error = new HttpError('Deletation falied',500);
     return next(error);
   }

   if(!place){
    const error = new HttpError('Place not Found, falied',500);
    return next(error);
   }

   if(place.creator.id !== req.userData.userId){
    const error = new HttpError('You are Not allowed to Delete this place ',401);
    return next(error);
  }

   try{
     const sess = await mongoose.startSession();
     sess.startTransaction();
    await place.remove({session:sess});
    place.creator.places.pull(place);
    await place.creator.save({session:sess});
    await sess.commitTransaction();
   }catch (err) {
     const error = new HttpError('Deletation falied',500);
     return next(error);
   }
   fs.unlink(place.image, err =>{
  });
  res.status(200).json({ message: 'Deleted place.' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
