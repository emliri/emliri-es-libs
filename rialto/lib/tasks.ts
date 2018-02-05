export abstract class Task<ResultType> {



  abstract execute(): Promise<ResultType>
}
