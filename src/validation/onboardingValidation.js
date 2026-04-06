const AppError = require('../utils/appError');

const questionKeyPattern = /^[a-z0-9_]{1,64}$/;
const maxAnswersPerRequest = 50;
const maxSerializedAnswerSize = 16 * 1024;

function validateQuestionKey(questionKey) {
  if (typeof questionKey !== 'string' || !questionKeyPattern.test(questionKey.trim())) {
    throw new AppError('Invalid question_key', 400);
  }

  return questionKey.trim();
}

function validateAnswersPayload(body) {
  if (!body || !Array.isArray(body.answers) || body.answers.length === 0) {
    throw new AppError('answers must be a non-empty array', 400);
  }

  if (body.answers.length > maxAnswersPerRequest) {
    throw new AppError(`answers cannot exceed ${maxAnswersPerRequest} items`, 400);
  }

  const answers = body.answers.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new AppError('Each answer item must be an object', 400);
    }

    if (!Object.prototype.hasOwnProperty.call(item, 'answer_value')) {
      throw new AppError('answer_value is required for each item', 400);
    }

    let serialized;
    try {
      serialized = JSON.stringify(item.answer_value);
    } catch (error) {
      throw new AppError('answer_value must be JSON serializable', 400);
    }

    if (serialized === undefined) {
      throw new AppError('answer_value cannot be undefined', 400);
    }

    if (Buffer.byteLength(serialized, 'utf8') > maxSerializedAnswerSize) {
      throw new AppError('answer_value is too large', 400);
    }

    return {
      questionKey: validateQuestionKey(item.question_key),
      answerValue: item.answer_value,
      answerValueSerialized: serialized,
    };
  });

  return { answers };
}

function validateQuestionKeyParams(params) {
  return {
    questionKey: validateQuestionKey(params?.questionKey || ''),
  };
}

module.exports = {
  validateQuestionKey,
  validateAnswersPayload,
  validateQuestionKeyParams,
};
