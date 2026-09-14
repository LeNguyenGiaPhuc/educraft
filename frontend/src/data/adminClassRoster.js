export function getNextStudentNumber(students = []) {
  const usedNumbers = new Set(
    students
      .map((student) => Number.parseInt(student.student_number, 10))
      .filter((number) => Number.isInteger(number) && number > 0),
  )

  let nextNumber = 1
  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1
  }

  return String(nextNumber)
}
