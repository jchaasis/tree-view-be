const express = require('express');
// const Sequelize = require('sequelize');

//will use bodyparser to accept the form data for the score
const bodyparser = require('body-parser');
//establish server
const port = process.env.PORT || 5000;
const app = express();

//initialize bodyparser
app.use(bodyparser.urlencoded({ extended: false }));

//enable cors
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
//create database
// const db = new Sequelize('treeView', 'christianhaasis', '', {
//     dialect: 'postgres',
// });
//schema for the scores database
// const Score = db.define('score', {
//     player: Sequelize.STRING,
//     score: Sequelize.INTEGER,
// });

// Sychronize the Score schema with the database, meaning make
// sure all tables exist and have the right fields.
// Score.sync()
//establish routes
  //get routes
  //get all the scores to display on the sidebar
  app.get("/", function(req, res){
      console.log('request received')
      res.send({response: "recieved the request"})
    // Score.findAll({
    // // Will order by score descending
    // order: Sequelize.literal('score DESC')
    // }).then((items)=>{
    //   res.send({
    //             Scores: items,
    //   });
    // });
  });
  //post routes
  app.post("/add", function(req, res){
      console.log('data posted')
    // let data = [];
    // let finalData;
    // req.on('data', (chunk) => {
    //     data.push(chunk);
    //   }).on('end', () => {
    //     //Filter out the data from the post request
    //     data = Buffer.concat(data).toString();
    //     //parse that data
    //     finalData = JSON.parse(data);
    //     //add a new score based off of the received data
    //      Score.create({
    //         player: finalData.user,
    //         score: finalData.score,
    //      });
    //   })
    //   //let the client know that we have received the information
    //   res.send({
    //       'request received': true
    //   })
  })

app.listen(port, function(){
    console.log(`Listening on port ${port}`);
  });