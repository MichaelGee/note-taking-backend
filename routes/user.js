const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const authenticate = require('../middleware/authenticate');

router.get('/',  authenticate, async (req, res) => {
  // get the user's id from request
  try{
    const {userId} = req
    const user = await prisma.user.findUnique({
      where: {user: userId}
    })

    if(!user){
      return res.status(404).json({error: "user not found"})
    }
    const {password, ...rest} = user
    res.status(200).json(rest);
  }catch (e) {
      res.status(500).json({error: e.message})
  }
})

module.exports = router
