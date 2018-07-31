const express = require('express');
const Sequelize = require('sequelize');

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
const db = new Sequelize('treeView', 'christianhaasis', '', {
    dialect: 'postgres',
});

//schema for the branch database
const Branch = db.define('branch', {
    name: Sequelize.STRING,
    children: Sequelize.INTEGER,
    min_range: Sequelize.INTEGER,
    max_range: Sequelize.INTEGER
});

const Leaf = db.define('leaf', {
    branch_name: Sequelize.STRING,
    leaf_number: Sequelize.INTEGER
});

// Sychronize the schemas with the database, meaning make
// sure all tables exist and have the right fields.
Branch.sync();
Leaf.sync();

//utility functions. TODO: move these elsewhere
//establish routes
  //get routes
  //get all the scores to display on the sidebar
  app.get("/", function(req, res){
      console.log('request received')
    //   res.send({response: "recieved the request"})
    Branch.findAll({
    // Will order by score descending
    // order: Sequelize.literal('score DESC')
    }).then((items)=>{
      res.send({
                Branches: items,
      });
    });
  });
  //post routes
  app.post("/add", function(req, res){
      console.log('data posted')
    let data = [];
    let finalData;
    req.on('data', (chunk) => {
        data.push(chunk);
      }).on('end', () => {
        //Filter out the data from the post request
        data = Buffer.concat(data).toString();
        //parse that data
        finalData = JSON.parse(data);
        console.log(finalData)
    //     //add a new Branch based off of the received data
         Branch.create({
            name: finalData.name,
            children: finalData.children,
            min_range: finalData.min,
            max_range: finalData.max,
         });
      })
    //   //let the client know that we have received the information
      res.send({
          'request received': true
      })
  })

app.listen(port, function(){
    console.log(`Listening on port ${port}`);
  });