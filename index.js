require("dotenv").config();
const express=require("express");
const app=express();
const path=require("path");
let ejs = require("ejs");
let pdf = require("html-pdf");
const moment=require("moment");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var twilio = require('twilio');
var passport = require("passport");
var cookieParser = require("cookie-parser");
var LocalStrategy = require("passport-local");
var methodOverride = require("method-override");
app.use(express.urlencoded({extended:true}))
var flash = require("connect-flash");
var client = require('socket.io').listen(4000).sockets;
const stripe = require('stripe')('sk_test_51IcWvrSIhRCyNTw3CJaUioTVOrL8izGAQd1j4j8N2tGJRG4tOrDi2fJGoEO9jOOSzu5ot8iFtPHL4eJYScm3voSu002lwzEr4t');
var people = {};
var nodemailer=require("nodemailer");
var amount=600;
app.set('view engine','ejs');
//app.set('views',path.join(__dirname,'/views'));
var global;
var specialization="patient";
const { isLoggedIn } = require("./middleware");

//GOOGLE CLOUD SETUP CREDENTIALS FOR EMAIL
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: "[senders email]",
    pass: "[senders password]",
    clientId: "",
    clientSecret: "",
    refreshToken: ""
  }
});


//MODELS
var User = require("./models/user");

//NEWS API
var axios = require("axios").default;
var options = {
  method: 'GET',
  url: 'https://vaccovid-coronavirus-vaccine-and-treatment-tracker.p.rapidapi.com/api/news/get-health-news/1',
  headers: {
    'x-rapidapi-key': '1e97002e39msh99c51792da34f78p1ead96jsne5e9489eb975',
    'x-rapidapi-host': 'vaccovid-coronavirus-vaccine-and-treatment-tracker.p.rapidapi.com'
  }
};
axios.request(options).then(function (response) {
}).catch(function (error) {
	console.error(error);
});

//PASSPORT CONFIGURATION
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname,'public')));
app.use(flash());
app.use(
  require("express-session")({
    secret: "Shhhh Secret!",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

//Mongo--------------------------------------------------
mongoose
  .connect("mongodb://localhost:27017/DoctAid", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to DB!"))
  .catch((error) => console.log(error.message));

//******************************ROUTES*************************************
//DEFAULT ROUTE
app.get('/',(req,res)=>{
  var currentTime=new Date().getHours();
 console.log(`Current time is ${currentTime}`);
  res.render('signup',{specialization});
  })

//LOGIN
app.get('/login',function(req,res){
  res.render('signup');
});

app.post('/login',function(req,res,next){
  console.log("inside post login");
  passport.authenticate("local",
  {
    successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: true,
    succssFlash: true,
  },
  function(err, user) {
    if (err) { 
     
      return next(err);
     }
    if (!user) {
      console.log("User doesnt exist");
      req.flash("error", "Invalid username or password");
      return res.redirect('/login');
    }
    req.logIn(user, err => {
      if (err) {
         return next(err); 
        }
      req.flash("success", "Good to see you again, " + user.username);
      return res.redirect('/home');
    });
  })(req, res, next);
});

//SIGNUP
app.get('/signup',function(req,res){
  res.render('signup');
});

app.post('/signup',async(req,res)=>{
  let newUser =  new User({
    username:req.body.name,
    Age:req.body.age,
    type:req.body.type,
    Gender:req.body.gender,
    email:req.body.email,
    password:req.body.password,
    phNumber:req.body.contact,
    field:req.body.specialization,
    degree:req.body.degree,
    experience:req.body.experience,
    address:req.body.address,
    finalRating:0,
    numberOfAppointments:0
  });
  
  console.log(newUser);

 await User.register(newUser, req.body.password,function(err,user){
   
      // req.flash("success", "Your account is successfully created!");
      // res.redirect("/home");
      if (err) {
        console.log(err);
        if (
          err.message == "A user with the given username is already registered"
        ) {
          console.log("User exists");
          //req.flash("error", "A user with the given Email Id is already registered")
          return res.redirect('/signup');
        } else {
          console.log("Users with same phone number exists");
          //req.flash("error", "A user with the given Phone No. is already registered")
          return res.redirect('/signup',{specialization});
        }
      } else {
        // passport.authenticate("local")(req,res,function(){
        //   res.redirect('/home');
        // });
        req.logIn(user, err => {
          if (err) {
             return next(err); 
            }
          req.flash("success", "Good to see you again, " + user.username);
          return res.redirect('/home');
        });
      }
});
});

// LOGOUT 
app.get('/logout',function(req,res){
  req.logout();
  req.flash("success", "You are Logged Out!");
  res.redirect("/signup");
});

//DOCTOR CHECKOUT PAGE
app.get('/checkoutdoctor',(req,res)=>{
  var patient;
  var date;
  for(var i=0;i<req.user.show_vc.length;i++){
    if(req.user.show_vc[i]==1)
    {
  patient=req.user.consultation[i];
date=req.user.appointment_dates[i];
  break;
    }
  }
  res.render('checkout_doctor',{patient,date});
});

app.post('/checkoutdoctor',(req,res)=>{
  var patient_id;
console.log(req.body);
console.log(req.user);
for(var i=0;i<req.user.show_vc.length;i++){
  if(req.user.show_vc[i]==1)
  {
patient_id=req.user.doctorArray[i];
break;
  }
}
User.findById(patient_id,function(err,foundPatient){
console.log(req.body.medications);
for(let m of req.body.medications){
  foundPatient.medicines.push(m.toString());
}
for(let r of req.body.reports){
  foundPatient.reports.push(r.toString());
}
for(let i of req.body.instructions){
  foundPatient.instructions.push(i.toString());
}
  foundPatient.save();
  console.log(foundPatient);
  ejs.renderFile(path.join(__dirname, './views/', "tpz.ejs"), {patient: foundPatient,contact:req.user.phNumber,clinic:req.user.address,degree:req.user.degree,doctName:req.user.username,date:"07/04/2021"}, (err, data) => {
    if (err) {
          res.send(err);
    } else {
        let options = {
            "height": "11.25in",
            "width": "8.5in",
            "header": {
                "height": "20mm"
            },
            "footer": {
                "height": "20mm",
            },
        };
        pdf.create(data, options).toFile("Prescription.pdf", function (err, data) {
            if (err) {
              console.log("Error Sid");
                res.send(err);
            } else {
                res.redirect('/home');//LETS FINISH WITH RATING FIRST
            }
        });
    }
});
});
});

//BUY MEDICINES PAGE
app.get('/medicalstores',(req,res)=>{
  res.render('medical_stores');
})

//HOME PAGE
app.get('/home',isLoggedIn,(req,res)=>{
  console.log("goooooo");
  for(var i=0;i<req.user.consultation.length;i++)
  {
   
    console.log("in loop");
  var d1 = new Date(req.user.booking_date[i].split(/\//).reverse().join('/'));   
  var d2 = new Date(req.user.appointment_dates[i].split(/\//).reverse().join('/'));  
  console.log(d1) ;
  console.log(d2);
  var diff = d2.getTime() - d1.getTime();   
  var daydiff = diff / (1000 * 60 * 60 * 24);   
  console.log(`Day diff is ${daydiff}`);

  var t1=(req.user.time[i].split(':'))[0];
  console.log(`Chosen time is ${t1}`);
  var currentTime=new Date().getHours()
  console.log(`Current time is ${currentTime}`);
  var timediff=currentTime-t1;
  console.log(timediff);
  console.log(timediff);
  if(daydiff==0&&timediff==0){
    console.log("imma here")
    req.user.show_vc[i]=1;
    User.findByIdAndUpdate(req.user.id, { show_vc: req.user.show_vc },
                            function (err, docs) {
    if (err){
        console.log(err)
    }
    else{
        console.log("Updated User : ", docs);
    }
});
  }   
  else{
    req.user.show_vc[i]=0;
    User.findByIdAndUpdate(req.user.id, { show_vc: req.user.show_vc },
                            function (err, docs) {
    if (err){
        console.log(err)
    }
    else{
        console.log("Updated User : ", docs);
    }
});
  }
  console.log(req.user.show_vc);
  console.log(req.user);
  }
  
    axios
    .request(options)
    .then(function (response) {
      news = response.data.news;
      if(req.user.type=="doctor")
      {
        User.findById(req.user._id).populate('doctorArray').exec(function(err,foundUser){
          console.log(foundUser);
          res.render('home',{news,user: foundUser});
        });
      }
      else
      {
      
        User.findById(req.user._id).populate('patientArray').exec(function(err,data){
          console.log(data);
          res.render('home',{news,user:data});
          res
        });        
      }
    })
    .catch(function (error) {
      console.error(error);
    });
});

//VIDEO CALL PAGE
app.get('/vc/:id',(req,res)=>{
  var room_code;
  var vc_rooms=(req.user.vc_rooms);
  var show_vc=req.user.show_vc;
  console.log(vc_rooms);
  console.log(show_vc);
  for( var i=0;i<show_vc.length;i++)
    {
      console.log("looped");
      if(show_vc[i]==1){
        console.log("found");
        room_code=vc_rooms[i];
        break;
      }
    }
  console.log(room_code);
  User.findById(req.params.id,function(err,doctorPassing){
    console.log(doctorPassing);
    res.render('vc',{room_code,doctor:doctorPassing});
  });
 
  //res.sendFile(path.join(__dirname+'/vc.html'));
})

//PATIENT CHECKOUT- FEEDBACK AND PAYMENT
app.get('/patientcheckout/:id',function(req,res){
User.findById(req.params.id,function(err,data){
  res.render('patient_checkout',{data:data});
});
    
});

app.post('/patientcheckout2/:id',function(req,res){
  User.findById(req.params.id,function(err,foundDoctor){
    if(err)
    {
      return res.render('/');
    }
    foundDoctor.Rating.push(req.body.rating);
    var temp=Average(foundDoctor.Rating);
    temp=precise(temp);
    foundDoctor.finalRating=temp;
    foundDoctor.save();
    res.render('checkout', {appointment : foundDoctor,amount:amount});
  });
});

//PAYMENT
app.post("/pay" , async (req,res) => {
  if(req.isAuthenticated()){
    try {
      const { paymentMethodId, items, app_id, currency } = req.body;
      const orderAmount = 60000;
      // Create new PaymentIntent with a PaymentMethod ID from the client.
      const intent = await stripe.paymentIntents.create({
      amount: orderAmount,
      currency: currency,
      payment_method: paymentMethodId,
      error_on_requires_action: true,
      confirm: true
      });
    
      console.log("Payment received! Rs. " + orderAmount/100);
      // The payment is complete and the money has been moved
      // You can add any post-payment code here (e.g. shipping, fulfillment, etc)
    
      // Send the client secret to the client to use in the demo
      User.findById(app_id,function(err,foundappointment){
        if(err){
          console.log(err);
          res.send({error: err});
        } else {
          foundappointment.paid.push(req.user._id);
          foundappointment.save();
                User.findById(foundappointment._id,function(err,doctor){
          User.findById(req.user._id,function (err, patient) {
            if (err || !patient) {
              console.log(err)
              // res.redirect("back");
              res.send({error : err});
            } else {
              console.log(patient);
              var mailOptions = {
                from: 'siddharthsshah1207@gmail.com',
                to: patient.email,
                subject: 'Email for confirmation of Payment',
                text: `Your Payment is Successfull! You have paid ${orderAmount/100} to Dr.${doctor.username}.`
              };
  
              console.log(mailOptions);
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
            }
          });
        });
      }
        
      res.send({ clientSecret: intent.client_secret });
      });
        
    } catch (e) {
      // Handle "hard declines" e.g. insufficient funds, expired card, card authentication etc
      // See https://stripe.com/docs/declines/codes for more
      if (e.code === "authentication_required") {
      res.send({
        error:
        "This card requires authentication in order to proceeded. Please use a different card."
      });
      } else {
      res.send({ error: e.message });
      }
    }
  } else {
    console.log('NOTLOGGEDIN')
    res.send({error : "You need to be logged in first"});
  }
  });

  app.get("/paymentSuccessfull/:id",function(req,res){
    User.findById(req.params.id,function(err,foundDoctor){
      if(err){
        console.log(err);
      } else {
        res.render("paymentSuccessfull",{appointment : foundDoctor} )
      } 
    });  
    });
  
//BOOK APPOINTMENT- SPEICIALIZATIONS PAGE
app.get('/bookappointment',(req,res)=>{
  res.render("bookApp");
});

//VIEW DOCTORS- VIEW DOCTORS OF A PARTICULAR SPECIALIZATION
app.get('/viewDoctors',function(req,res){
  User.find({type:"doctor",field:global},function (err,doctors) {
    if(err)
    {
      req.flash('error','Something went wrong');
      return res.redirect('/');
    }
    console.log('imp');
    console.log(doctors.length);
    console.log(doctors[0].finalRating);
    for(var i=0;i<doctors.length-1;i++)
  {
    for(var j=0;j<doctors.length-i-1;j++)
    {
      if(doctors[j+1].finalRating>doctors[j].finalRating)
      {
        var temp=doctors[j];
        doctors[j]=doctors[j+1];
        doctors[j+1]=temp;
      }
    }
  }
    res.render('viewDoctors',{allDoctors:doctors}); 
});
});

app.post('/bookappointment',function(req,res){
  global=req.body.specialization
  console.log(global);
  res.redirect('/viewDoctors');
});

//BOOKING DOCTOR- APPOINTMENT DETAILS SELECTION
app.get('/bookdoctor/:id',(req,res)=>{
  User.findById(req.params.id,function(err,foundDoctor){
    console.log('Main')
    res.render('bookDoctor',{doctor:foundDoctor});
  }); 
});
app.post('/bookdoctor/:id/updation',function(req,res){
  var room_code=(Math.floor(Math.random() * 0xFFFFFF).toString(16));
  var consultDoctor;
  var booking_date = new Date().toJSON().slice(0, 10).replace(/-/g, "/").toString();
  var appointment_date=req.body.appointmentdate;
  appointment_date=appointment_date.replace(/-/g, "/");
  appointment_date = appointment_date.split("/").reverse().join("/");
  booking_date = booking_date.split("/").reverse().join("/");
  User.findById(req.params.id,function(err,doctor){
    consultDoctor=doctor.username;
    doctor.consultation.push(req.user.username);
    doctor.doctorArray.push(req.user._id);
    doctor.time.push(req.body.timee);
    doctor.appointment_dates.push(appointment_date);
    doctor.booking_date.push(booking_date);
    doctor.show_vc.push(0);
    doctor.vc_rooms.push(room_code);
    doctor.save();
    console.log(doctor);
  });
  console.log('NOW PATIENT');
  User.findById(req.user._id,function(err,patient){
    patient.patientArray.push(req.params.id);
    patient.consultation.push(consultDoctor);
    patient.time.push(req.body.timee);
    patient.appointment_dates.push(appointment_date);
    patient.booking_date.push(booking_date);
    patient.show_vc.push(0);
    patient.vc_rooms.push(room_code);
    patient.save();
    let mailOptions = {
      from: "siddharth1207@gmail.com",
      to: patient.email,
      subject: 'Appointment Confirmation',
      text:'Thankyou for booking with DoctAid',
      html:`<h3>Your appointment with Dr ${consultDoctor} on ${appointment_date} at ${req.body.timee} is confirmed!</h3><h4>Get Well Soon!!</h4> <h4 class="text-center">
      Team Doct<span style="color: green">Aid</span>
    </h4><div>Powered By Sidoy Techworks</div>`
    };
    transporter.sendMail(mailOptions, function(err, data) {
      if (err) {
        console.log("Error " + err);
      } else {
        console.log("Email sent successfully");
      }
    });
    console.log(patient);
  });
  res.redirect('/bookingconfirm/'+req.params.id);
});

//BOOKING CONFIRMATION
app.get('/bookingconfirm/:id',function(req,res){
  User.findById(req.params.id,function(err,theDoctor){
    res.redirect('/home');
  });
  
});

//PRESCRIPTION PDF
app.get('/tpz',(req,res)=>{
  var clinic;
  var contact;
  var doctName;
  var degree;
  var date;
  let mailOptions = {
    from: "siddharth1207@gmail.com",
    to: req.user.email,
    subject: 'Prescription',
    html:`<h3>Greetings!</h3><h3>Here is your Prescription from the last appointment!</h3><h4 class="text-center">
    Team Doct<span style="color: green">Aid</span>
  </h4><div>Powered By Sidoy Techworks</div>`,
    attachments:{ filename: "Prescription.pdf", path:'./Prescription.pdf' },
  };
  transporter.sendMail(mailOptions, function(err, data) {
    if (err) {
      console.log("Error " + err);
    } else {
      console.log("Email sent successfully");
    }
  });
  for( var i=0;i<req.user.show_vc.length;i++)
  {
    if(req.user.show_vc[i]==1){
      doctName=req.user.consultation[i];
      date=req.user.appointment_dates[i];
      User.findById(req.user.patientArray[i]).populate('patientArray[i]').exec(function(err,data){
        console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

       contact=data.phNumber;
console.log(contact);
       clinic=data.address;
       degree=data.degree;
        console.log(data); 
      }); 
      break;
    }
  }
  res.render('tpz',{patient:req.user,contact,clinic,degree,doctName,date});

});


//OTP
// app.get('/otp',(req,res)=>{
//   res.render('test_otp');
// })
// app.post('/otp',(req,res)=>{
//   console.log("otp mei hu")
//   const accountSid = "AC37109682f3c5c61382d4999aa85381e7";
//   const authToken ="e0a9ab6d9368bc9af1dc3116f78bce3f";
//   const client = require('twilio')(accountSid, authToken);
  
//   client.verify.services('VAac5a75ba181b9f25e179f9026d916feb')
//                .verifications
//                .create({to: '+919769199523', channel: 'sms',code:"2222"})
//                .then(
//                  verification => console.log(verification.status));
//  res.end("done")
// });
// app.post('/verify_otp',(req,res)=>{
//   res.send("done");
// })

//POSE MATCH
app.get("/poseMatch", function (req, res) {
	res.render("poseMatch");
});
           
//ERROR ROUTE -FOR ANY GIBBERISH URL
app.get("*",function(req,res){
  res.render("error");
});

//FUNCTIONS
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

function SortRating(doctors)
{
  for(var i=0;i<doctors.length;i++)
  {
    for(var j=0;j<doctors.length-i-1;j++)
    {
      if(doctors[j+1].finalRating>doctors[j].finalRating)
      {
        var temp=doctors[j];
        doctors[j]=doctors[j+1];
        doctors[j+1]=temp;
      }
    }
  }
}

function Average(array)
{
  var avg=0;
  for(var i=0;i<array.length;i++)
  {
    avg+=array[i];
  }
  avg=avg/(array.length);
  return avg;
}

function shuffle(array) {
  var currentIndex = array.length,
      temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
  }

  return array;
}

function precise(x) {
  return Number.parseFloat(x).toPrecision(2);
}

//SERVER CALLING
app.listen(5500,()=>{
    console.log("LISTENING ON 5500");
});