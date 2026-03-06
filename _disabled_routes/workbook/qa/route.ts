import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Temporary file storage for demo purposes
import fs from 'fs';
import path from 'path';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const questions = readQuestions();

    // Return questions, marking which ones the user has upvoted
    const questionsWithUserVotes = questions.map((q: any) => ({
      ...q,
      hasUpvoted: q.upvotedBy?.includes(userId) || false,
      // Don't expose upvotedBy array to client
      upvotedBy: undefined,
    }));

    return NextResponse.json({
      questions: questionsWithUserVotes,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching Q&A data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      question,
      askerName,
      isAnonymous,
      session,
      userEmail,
    } = body;

    // Validation
    if (!userId || !question?.trim()) {
      return NextResponse.json(
        { error: 'User ID and question are required' },
        { status: 400 }
      );
    }

    if (question.trim().length > 500) {
      return NextResponse.json(
        { error: 'Question must be under 500 characters' },
        { status: 400 }
      );
    }

    // Create new question
    const newQuestion = {
      id: uuidv4(),
      userId,
      question: question.trim(),
      askerName: isAnonymous ? 'Anonymous' : (askerName || 'Unknown'),
      isAnonymous: Boolean(isAnonymous),
      timestamp: new Date().toISOString(),
      session: session || undefined,
      status: 'pending' as const,
      upvotes: 0,
      upvotedBy: [] as string[],
      userEmail: userEmail || '',
    };

    const questions = readQuestions();
    questions.push(newQuestion);

    // Sort questions by timestamp (newest first) and limit to 100 questions
    const sortedQuestions = questions
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

    writeQuestions(sortedQuestions);

    return NextResponse.json({
      success: true,
      questionId: newQuestion.id,
      message: 'Question submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting question:', error);
    return NextResponse.json(
      { error: 'Failed to submit question' },
      { status: 500 }
    );
  }
}

// Admin endpoint to update question status (for coaches)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, status, adminKey } = body;

    // Simple admin authentication (in production, use proper auth)
    if (adminKey !== 'workshop-admin-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    if (!['pending', 'answered', 'in_queue'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    questions[questionIndex].status = status;
    writeQuestions(questions);

    return NextResponse.json({
      success: true,
      message: `Question status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating question status:', error);
    return NextResponse.json(
      { error: 'Failed to update question status' },
      { status: 500 }
    );
  }
}