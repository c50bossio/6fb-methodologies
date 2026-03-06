import { NextRequest, NextResponse } from 'next/server';

// Import the questions array from the main route
// In production, this would use a shared database
import fs from 'fs';
import path from 'path';

// Temporary file storage for demo purposes
const QUESTIONS_FILE = path.join(process.cwd(), 'tmp', 'questions.json');

// Ensure tmp directory exists
if (!fs.existsSync(path.dirname(QUESTIONS_FILE))) {
  fs.mkdirSync(path.dirname(QUESTIONS_FILE), { recursive: true });
}

// Helper functions to read/write questions from file
function readQuestions() {
  try {
    if (fs.existsSync(QUESTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading questions file:', error);
  }
  return [];
}

function writeQuestions(questions: any[]) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
  } catch (error) {
    console.error('Error writing questions file:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, questionId } = body;

    if (!userId || !questionId) {
      return NextResponse.json(
        { error: 'User ID and Question ID are required' },
        { status: 400 }
      );
    }

    const questions = readQuestions();
    const questionIndex = questions.findIndex((q: any) => q.id === questionId);

    if (questionIndex === -1) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const question = questions[questionIndex];

    // Check if user already upvoted
    if (!question.upvotedBy) {
      question.upvotedBy = [];
    }

    const hasUpvoted = question.upvotedBy.includes(userId);

    if (hasUpvoted) {
      // Remove upvote
      question.upvotedBy = question.upvotedBy.filter((id: string) => id !== userId);
      question.upvotes = Math.max(0, (question.upvotes || 0) - 1);
    } else {
      // Add upvote
      question.upvotedBy.push(userId);
      question.upvotes = (question.upvotes || 0) + 1;
    }

    writeQuestions(questions);

    return NextResponse.json({
      success: true,
      upvotes: question.upvotes,
      hasUpvoted: !hasUpvoted,
      message: hasUpvoted ? 'Upvote removed' : 'Question upvoted',
    });
  } catch (error) {
    console.error('Error handling upvote:', error);
    return NextResponse.json(
      { error: 'Failed to process upvote' },
      { status: 500 }
    );
  }
}