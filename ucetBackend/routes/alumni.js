import express from 'express';
import db from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Alumni Registration
router.post('/register', async (req,res)=>{
  const {name,email,password,year} = req.body;
  const hashed = await bcrypt.hash(password, 10);
  db.query('INSERT INTO alumni (name,email,password,year) VALUES (?,?,?,?)',
    [name,email,hashed,year],
    (err,result)=>{
      if(err) return res.status(500).json({error:'DB error'});
      res.json({message:'Alumni registered successfully'});
    });
});

// Alumni Login
router.post('/login', (req,res)=>{
  const {email,password} = req.body;
  db.query('SELECT * FROM alumni WHERE email=?', [email], async (err,result)=>{
    if(err) return res.status(500).json({error:'DB error'});
    if(result.length===0) return res.status(400).json({error:'Alumni not found'});

    const valid = await bcrypt.compare(password, result[0].password);
    if(!valid) return res.status(400).json({error:'Invalid password'});

    const token = jwt.sign({id:result[0].id, role:'alumni'}, process.env.JWT_SECRET);
    res.json({token, name:result[0].name});
  });
});

export default router;
