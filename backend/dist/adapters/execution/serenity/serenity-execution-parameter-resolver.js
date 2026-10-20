export class SerenityExecutionParameterResolver {
    resolve(propertyName) {
        const normalized = propertyName.trim();
        if (normalized ===
            "serenity.environment") {
            return {
                parameterId: "environment",
            };
        }
        if (normalized ===
            "cucumber.filter.tags" ||
            normalized ===
                "tags") {
            return {
                parameterId: "labels",
            };
        }
        return undefined;
    }
}
