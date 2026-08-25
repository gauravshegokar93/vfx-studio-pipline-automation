const Joi = require('joi');

// ==========================================
// Create User
// ==========================================

const createUserSchema = Joi.object({

  name: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .required(),

  employeeCode: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required(),

  email: Joi.string()
    .trim()
    .email()
    .required(),

  role: Joi.string()
    .trim()
    .required(),

  departmentId: Joi.string()
    .allow(null, '')
    .optional(),

  teamId: Joi.string()
    .allow(null, '')
    .optional(),

  leadId: Joi.string()
    .allow(null, '')
    .optional(),

  username: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .allow('', null)
    .optional(),

  password: Joi.string()
    .min(6)
    .max(100)
    .required()

});

// ==========================================
// Update User
// ==========================================

const updateUserSchema = Joi.object({

  name: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .required(),

  email: Joi.string()
    .trim()
    .email()
    .required(),

  role: Joi.string()
    .trim()
    .required(),

  departmentId: Joi.string()
    .allow(null, '')
    .optional(),

  leadId: Joi.string()
    .allow(null, '')
    .optional(),

  isActive: Joi.boolean()
    .required()

});

// ==========================================
// Update Credentials
// ==========================================

const updateCredentialSchema = Joi.object({

  username: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required(),

  password: Joi.string()
    .min(6)
    .max(100)
    .allow('', null)

});

// ==========================================
// User Id Validation
// ==========================================

const userIdSchema = Joi.object({

  id: Joi.string()
    .guid({
      version: [
        'uuidv4',
        'uuidv5'
      ]
    })
    .required()

});

// ==========================================
// Search Validation
// ==========================================

const searchUserSchema = Joi.object({

  q: Joi.string()
    .allow('', null),

  departmentId: Joi.string()
    .allow('', null),

  role: Joi.string()
    .allow('', null),

  status: Joi.string()
    .valid('Active', 'Inactive')
    .allow('', null),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)

});

// ==========================================

module.exports = {

  createUserSchema,

  updateUserSchema,

  updateCredentialSchema,

  userIdSchema,

  searchUserSchema

};