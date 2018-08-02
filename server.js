const express = require('express');
const Sequelize = require('sequelize');
//will use bodyparser to accept the form data for the score
const bodyparser = require('body-parser');
//establish server
const port = process.env.PORT || 5000;
const app = express();
var http = require('http').Server(app);

var io = require('socket.io')();

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
    branchId: Sequelize.INTEGER,
    leafNumber: Sequelize.INTEGER
});

//table relationships
Branch.hasMany(Leaf, {foreignkey: 'branchId', as: 'leaves'});
Leaf.belongsTo(Branch, {foreignKey: 'branchId'});

// Sychronize the schemas with the database, meaning make
// sure all tables exist and have the right fields.
Branch.sync();
Leaf.sync();

//utility functions. TODO: move these elsewhere
    //get a random number between the range set 
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; 
      }

    function growLeaves(branch) {
        //counter to count the number of children to create
        let counter = 0;
        //store the numbers that will be used for leaves
        let leaves = [];
        //while the counter is less than the number of requested children, add a new random number to the array with the corresponding branchid
        while (counter < branch.children){
            leaves.push({
                branchId: branch.id,
                leafNumber: getRandomInt(branch.min_range,branch.max_range)
            })
            counter ++
        }
        //create a bulk of instances based off of the numbers stored in the leaves array
        Leaf.bulkCreate(leaves);
    }

//socket stuff
// io.on('connection', function(socket){
//     console.log('a user connected');
// });

io.on('connection', (client) => {
    //send the branch data currently stored in the database
    client.on('getBranchData', (interval)=> {
        console.log('a user is receiving the branch ', interval );
        //get all the branches
        Branch.findAll({
            include: [ {model: Leaf, as: 'leaves'}],
            // Will order by score descending
            // order: Sequelize.literal('score DESC')
            }).then((items)=>{
                client.emit('branches', {Branches: items});//send data
            });
    })
    //add a new branch to the table. Once added, emit the updated tree to all users.
    client.on('addBranch', (formData)=> {
        //add instance in the branches table
        Branch.create({
            name: formData.name,
            children: formData.children,
            min_range: formData.min,
            max_range: formData.max,
        }).then((branch)=> {
           //create a batch of leaves
            growLeaves(branch)
        })
        .then(()=>
             Branch.findAll({
                include: [ {model: Leaf, as: 'leaves'}],
            // Will order by score descending
            // order: Sequelize.literal('score DESC')
            }).then((items)=>{
                io.emit('branches', {Branches: items});//send data
            }));
    })

    //remove a branch from the table. Once removed, remove the associated leaves as well. once both of those tasks are complete, emit the updated tree to all active users.
    client.on('deleteBranch', branch=> {
        Branch.destroy({
            where: {
                id: branch
            }
        }).then(()=>{
            Leaf.destroy({
                where: {
                    branchId: branch
                }
            })
        }).then(()=> {
            Branch.findAll({
                include: [ {model: Leaf, as: 'leaves'}],
            // Will order by score descending
            // order: Sequelize.literal('score DESC')
            }).then((items)=>{
                io.emit('branches', {Branches: items});//send data
            });
        })
        

    })
    //when a user disconnects
    client.on('disconnect', function(){
        console.log('user disconnected');
      });
});
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


io.listen(port);
// app.listen(port, function(){
//     console.log(`Listening on port ${port}`);
//   });