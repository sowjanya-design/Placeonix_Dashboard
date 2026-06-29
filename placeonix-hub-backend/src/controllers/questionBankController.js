const InterviewQuestion = require('../models/InterviewQuestion');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List / search questions
// @route  GET /api/v1/question-bank?search=&company=&role=&topic=&difficulty=
exports.listQuestions = asyncHandler(async (req, res) => {
  const { search, company, role, topic, difficulty } = req.query;
  const filter = {};
  if (company) filter.company = new RegExp(company, 'i');
  if (role) filter.role = new RegExp(role, 'i');
  if (topic) filter.topic = new RegExp(topic, 'i');
  if (difficulty) filter.difficulty = difficulty;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ question: rx }, { company: rx }, { role: rx }, { topic: rx }, { tags: rx }];
  }
  const questions = await InterviewQuestion.find(filter).sort('-createdAt').limit(300);
  return ApiResponse.success(res, 200, 'Questions fetched', questions);
});

// @desc   Add a question (admin/mentor)
// @route  POST /api/v1/question-bank
exports.createQuestion = asyncHandler(async (req, res) => {
  const body = { ...req.body, createdBy: req.user._id };
  if (typeof body.tags === 'string') body.tags = body.tags.split(',').map((t) => t.trim()).filter(Boolean);
  const question = await InterviewQuestion.create(body);
  return ApiResponse.created(res, 'Question added', { question });
});

// @desc   Update a question (admin/mentor)
// @route  PATCH /api/v1/question-bank/:id
exports.updateQuestion = asyncHandler(async (req, res, next) => {
  if (typeof req.body.tags === 'string') req.body.tags = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
  const question = await InterviewQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!question) return next(new AppError('Question not found', 404));
  return ApiResponse.success(res, 200, 'Question updated', { question });
});

// @desc   Delete a question (admin/mentor)
// @route  DELETE /api/v1/question-bank/:id
exports.deleteQuestion = asyncHandler(async (req, res, next) => {
  const question = await InterviewQuestion.findByIdAndDelete(req.params.id);
  if (!question) return next(new AppError('Question not found', 404));
  return ApiResponse.success(res, 200, 'Question removed');
});
