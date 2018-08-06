const express = require('express');
const Sequelize = require('sequelize');
//will use bodyparser to accept the form data for the score
const bodyparser = require('body-parser');
//establish server
const port = process.env.PORT || 5000;
const app = express().listen(port, () => console.log(`Listening on ${ port }`));;

var http = require('http').Server(app);
//connect to db
const { Client } = require('pg');
const client2 = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

client2.connect();

// client2.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
//   if (err) throw err;
//   for (let row of res.rows) {
//     console.log(JSON.stringify(row));
//   }
//   client2.end();
// });

// var io = require('socket.io')();
const io = socketIO(app);
//initialize bodyparser
app.use(bodyparser.urlencoded({ extended: false }));

//enable cors
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
//create database


// if (process.env.HEROKU_POSTGRESQL_BRONZE_URL) {
//     // the application is executed on Heroku ... use the postgres database
//     sequelize = new Sequelize(process.env.HEROKU_POSTGRESQL_BRONZE_URL, {
//       dialect:  'postgres',
//       protocol: 'postgres',
//       port:     match[4],
//       host:     match[3],
//       logging:  true //false
//     })
//   } else {
//     // the application is executed on the local machine ... use mysql
//     sequelize = new Sequelize('example-app-db', 'root', null)
//   }
// const db = new Sequelize('treeView', 'christianhaasis', '', {
//     dialect: 'postgres',
// });

const db = new Sequelize(process.env.DATABASE_URL, {
    dialect:  'postgres',
          protocol: 'postgres',
       
})

//schema for the branch database
const Branch = db.define('branch', {
    name: Sequelize.STRING,
    children: Sequelize.INTEGER,
    min: Sequelize.INTEGER,
    max: Sequelize.INTEGER
});


client2.query('SELECT * FROM branches;', (err, res) => {
    if (err) throw err;
    for (let row of res.rows) {
      console.log(JSON.stringify(row));
    }
    client2.end();
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

    function growLeaves(branch, edit) {
        //if edit is true, then this will be a generation of new leaves based off of the edited range of a preexisting branch. We need to store the appropriate min and max values for use in leaf generation. 
          //if its an edit and there is no new min set, then use the old min
        let min = (edit === true && branch.min === '') ? branch.oldMin : branch.min;
          //if its an edit and there is no new max set, then use the old max
        let max = (edit === true && branch.max === '') ? branch.oldMax: branch.max;
        //counter to count the number of children to create
        let counter = 0;
        //store the numbers that will be used for leaves
        let leaves = [];
        //while the counter is less than the number of requested children, add a new random number to the array with the corresponding branchid
        while (counter < branch.children){
            leaves.push({
                branchId: branch.id,
                leafNumber: getRandomInt(min,max)
            })
            counter ++
        }
        //create a bulk of instances based off of the numbers stored in the leaves array
        Leaf.bulkCreate(leaves);
    }

    function checkForSpecChars(arr){
        //store the chars counter
        let specCharsPresent = false;
        //symbols to check for
        let re = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g;
        //iterate through the information passed in and check for symbols in each element. 
        for(let i = 0; i<arr.length; i++){
            if (re.test(arr[i]) === true) {
                return specCharsPresent = true;
            }
        }
        return specCharsPresent;
    }

    function confirmNums(nums){
        let allNums = true;
        //make sure that the number inputs are actually numbers.
        for (let i = 0; i<nums.length; i++){
            //if there is anything other than a number present, the input is invalid.
            if (!/\D/.test(nums[i] === false)){
                return allNums = false;
            }
        }
        return allNums;
    }

    function validateInputs(branch, edit) {
        //if its an edit and there is no new min set, then use the old min
        let min = (edit === true && branch.min === '') ? branch.oldMin : parseInt(branch.min);
        //if its an edit and there is no new max set, then use the old max
        let max = (edit === true && branch.max === '') ? branch.oldMax : parseInt(branch.max);
        let valid = true;
        //Make sure that there are no symbols in any of the inputs
        if (checkForSpecChars([branch.name, branch.children, min, max])=== true){
            valid = false;
        }
        //make sure that all the number inputs are actually numbers
        if (confirmNums([branch.children, min, max]) === false){
            valid = false;
        }
        //validate that the name input is between 3 and 15 chars
        if (branch.name.length < 3 || branch.name.length > 15){
            valid = false;
        }
        //validate that the children is between 0 and 15
        if (branch.children < 0 || branch.children > 15){
            valid = false;
        }
        //validate that the range is accurate
        if (min >= max){
            valid = false
        }

        return valid;
    }

    //store the message so we don't have to repeat it multiple times
    const formErrMess = 'Please ensure that all form inputs abide by the form requirements. Click on the question mark located next to the root for requirement details.';

//socket stuff
io.on('connection', (client) => {
    //functions containing repeating socket calls or sequelize queries
    function findAndSendBranches(){
        Branch.findAll({include: [{model: Leaf, as: 'leaves'}], order: Sequelize.literal('id')})//order from oldest to newest
            .then((items)=>{ client.emit('branches', {Branches: items})});
    }
    //send the branch data currently stored in the database
    client.on('getBranchData', (b)=> {
        console.log('a user is receiving the branch ', b );
        //get all the branches
        findAndSendBranches();
    })
    //add a new branch to the table. Once added, emit the updated tree to all users.
    client.on('addBranch', (formData)=> {
        //validate that the inputs are acceptable
        if (validateInputs(formData)===false){
            client.emit('formError', formErrMess)
            return;
        }
        //add instance in the branches table. depending on how the number is inputed into the form, it could come across as an integer or a string. Parse it here to handle both methods.
        Branch.create({
            name: formData.name,
            children: formData.children,
            min: formData.min,
            max: formData.max,
        }).then((branch)=> {growLeaves(branch)}) //create a batch of leaves
        .then(()=> findAndSendBranches()); //send updated tree
    })

    //remove a branch from the table. Once removed, remove the associated leaves as well. once both of those tasks are complete, emit the updated tree to all active users.
    client.on('deleteBranch', branch=> {
        Branch.destroy({where: {id: branch}})//delete branch instance
            .then(()=> Leaf.destroy({ where: {branchId: branch}}))//delete leaf instances associated with deleted branch
            .then(()=> findAndSendBranches());//send updated tree
    });
    
    //updatethe branches
    client.on('updateBranch', branch=> {
        //handle the validation on the front end. This way, if there is a range update, we can perform that update in one conditional statement. 
        let bMin = branch.min === '' ? branch.oldMin : parseInt(branch.min);
        let bMax = branch.max === '' ? branch.oldMax : parseInt(branch.max);
        console.log(branch)
        //validate the inputs from the edit form
        if (checkForSpecChars(branch)===true){
            client.emit('formError', formErrMess)
            return;
        }
        //if the name is the only property to update.
        if(branch.name !== '' && (branch.min === '' && branch.max === '')){
            //make sure the name is still acceptable
            if (checkForSpecChars(branch.name)===true || branch.name.length < 3 || branch.name.length > 15){
                client.emit('formError', formErrMess)
                return;
            }
            Branch.update({name: branch.name},{where: {id: branch.id}})
                .then(()=>findAndSendBranches());//send updated tree
        //update both the min and the max range. Even if one of them is being updated by the client, we will receive a number value for both the min and the max. If we don't then an error has occured or a bug is present. So if we update only the min, the old max will still be passed down so that we can generate the new leaves based off of the two values. 
        } 
        else if(branch.name === '' && (branch.min !== '' || branch.max !== '')){
             //validate the inputs from the edit form
            if (confirmNums([branch.children, bMin, bMax])===false || bMin >= bMax ){
                client.emit('formError', formErrMess)
                return;
            }
            //update the branch range
            Branch.update(
                {min: bMin, max: bMax},
                {where: {id: branch.id}})
                .then(()=> Leaf.destroy({where: {branchId: branch.id}})) //remove the previous leaves before adding new ones
                .then(()=> growLeaves(branch, true))//grow new leaves
                .then(()=> findAndSendBranches());//send new tree info
           //finally, if the name and atleaset on range input is being updated
        } else if (branch.name !== '' && (branch.min !== '' || branch.max !== '')){
            //validate name
            if (checkForSpecChars(branch.name)===true || branch.name.length < 3 || branch.name.length > 15){
                client.emit('formError', formErrMess)
                return;
            }
            //validate nums
            if (confirmNums([branch.children, bMin, bMax])===false || bMin >= bMax){
                client.emit('formError', formErrMess)
                return;
            }
            Branch.update(
                {name: branch.name, min: bMin, max: bMax},
                {where: {id: branch.id}})
                .then(()=> Leaf.destroy({ where: {branchId: branch.id}}))//remove the previous leaves before adding new ones
                .then(()=> growLeaves(branch, true)) //add new leaves with the new branch info
                .then(()=> findAndSendBranches())  //send out the updated tree
        }
    })

    //when a user disconnects
    client.on('disconnect', function(){
        console.log('user disconnected');
      });
});

io.listen(port);
console.log(`Listening on port ${port}`);
// app.listen(port, function(){
//     console.log(`Listening on port ${port}`);
//   });