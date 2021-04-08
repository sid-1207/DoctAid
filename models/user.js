var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var UserSchema = new mongoose.Schema({
    username:String,
    Age:String,
    type:String,
    Gender:String,
    degree:String,
    experience:String,
    address:String,
    email: { type: String, unique: true, required: true },
    password:String,
    phNumber:{type: String, unique: true},
    doctorArray:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    consultation:[
        {
            type: mongoose.Schema.Types.String,
            ref: "User"
        }
    ],
    patientArray:[
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
        }
    ],
    time:[
        {
            type: mongoose.Schema.Types.String,
            ref: "User"
        }
    ],
    appointment_dates:[{
        type: mongoose.Schema.Types.String,
        ref: "User"
    }],
    booking_date:[{
        type: mongoose.Schema.Types.String,
        ref: "User"
    }],
    show_vc:[{
        type: mongoose.Schema.Types.Number,
        ref: "User"
    }],
    vc_rooms:[{
        type: mongoose.Schema.Types.String,
        ref: "User"
    }],
    medicines:[{
        type: mongoose.Schema.Types.String,
        ref: "User"
    }],
    reports:[{
        type: mongoose.Schema.Types.String,
        ref: "User"
    }],
    instructions:[{
        type: mongoose.Schema.Types.String,
        ref: "User"
    }],
    field:String,
    image:String,
    paid:[
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
        }
    ],
    Rating:[
        {
        type: mongoose.Schema.Types.Number,
        ref: "User"
        }
    ],
    finalRating:Number,
    numberOfAppointments:Number
});
UserSchema.plugin(passportLocalMongoose, {usernameUnique : false});
module.exports = mongoose.model("User", UserSchema);