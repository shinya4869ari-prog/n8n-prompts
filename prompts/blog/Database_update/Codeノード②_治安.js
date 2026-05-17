anzen["最終アップデート日"] = today;
anzen["次回アップデート予定日"] = anzenUpdated.length > 0 ? calcNextUpdate(anzenUpdated, thresholds) : (rowData["次回アップデート予定日"] || calcNextUpdate(Object.keys(thresholds), thresholds));
anzen["アップデート状態"] = anzenMissingFields.length > 0 ? "⚠️未取得" : anzenUpdated.length > 0 ? "✅完了" : "🔄要更新";