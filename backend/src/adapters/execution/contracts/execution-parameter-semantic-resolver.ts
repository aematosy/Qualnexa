export interface ExecutionParameterSemantic {
  parameterId: string;
}

export interface ExecutionParameterSemanticResolver {
  resolve(
    propertyName: string,
    propertyValue?: string,
  ): ExecutionParameterSemantic | undefined;
}