const bcrypt = require("bcrypt");

(async () => {

    const password = "Admin@123";

    const hash = await bcrypt.hash(password, 10);

    console.log("Generated Hash:", hash);

    const match = await bcrypt.compare(password, hash);

    console.log("Self Test:", match);

})();