const Property = require('../models/Property')
const propertyController = require('express').Router()
const verifyToken = require('../middlewares/verifyToken')


// property search by Ownerid
propertyController.get("/getByOwner/:typeName", async (req, res) => {
  const { typeName } = req.params;
  const { ownerId } = req.query;
  const VALID_TYPES = ["Offer", "Rent", "Sale", "All"];

  if (!VALID_TYPES.includes(typeName)) {
    return res.status(400).json({ error: "Invalid type provided" });
  }

  try {
    let query = { currentOwner: ownerId };

    if (typeName === "Offer") {
      query.offer = true;
    } else if (typeName !== "All") {
      query.type = typeName;
    }

    const properties = await Property.find(query).populate(
      "currentOwner",
      "-password"
    );
    return res.status(200).json(properties);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});



// get properties type based
propertyController.get('/find/:typeName', async (req, res) => {
    const type = req.params.typeName;
    try {
        if (type) {
            if(type=="Offer"){
                 const offerProperties = await Property.find({
                   offer: true,
                 }).populate("currentOwner", "-password");
                 return res.status(200).json(offerProperties);
            }else if(type =="Rent" || type=="Sale"){
                const properties = await Property.find({ type: type }).populate(
                  "currentOwner",
                  "-password"
                );
                return res.status(200).json(properties);
            }else if(type=="All"){
                const properties = await Property.find({});
                return res.status(200).json(properties);
            }
            
        } else {
            return res.status(400).json({ msg: "Invalid Type parameter" });
        }
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
});

// get individual property
propertyController.get('/find', async (req, res) => {
  const id = req.query.id;
  try {
    const property = await Property.findById(id).populate('currentOwner', '-password');
    if (!property) {
      throw new Error('No such property with that id');
    } else {
      return res.status(200).json(property);
    }
  } catch (error) {
    return res.status(500).json(error);
  }
});


// create a property
propertyController.post('/',verifyToken,async(req,res) =>{
    try {
        const newProperty = await Property.create({...req.body, currentOwner: req.user.id})
        return res.status(201).json(newProperty)
    } catch (error) {
        console.log(error.message)
        return res.status(500).json(error.message)
    }
});

// update property
propertyController.put('/:id',verifyToken,async(req,res) =>{
    try {
        const property = await Property.findById(req.params.id)
        if(property.currentOwner.toString() !== req.user.id.toString()){
            throw new Error("Not authorized to change others properties")
        }else{
            const updatedProperty = await Property.findByIdAndUpdate(
                req.params.id,
                {$set: req.body},
                {new: true}
            )
            return res.status(200).json(updatedProperty)
        }
    } catch (error) {
        return res.status(500).json(error.message)
    }
});

// delete property
propertyController.delete('/delete/:id', verifyToken, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ msg: "Property not found" });
        }
        if (property.currentOwner.toString() !== req.user.id.toString()) {
            throw new Error("Not authorized to delete others' properties");
        }
        await property.delete();
        return res.status(200).json({ msg: "Property deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


module.exports = propertyController