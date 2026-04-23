export interface Question {
    questionId: number;
    question: string;
    answersCount?: number; // optional, wird für Admin Fragenmanagement genutzt
}
