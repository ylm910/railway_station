package com.railway.entity;

import lombok.Data;

/**
 * 列车实体类
 */
@Data
public class Train {
    private Integer id;          // 列车编码
    private String trainCode;    // 列车代码
    private String trainType;    // 列车类型 G/D/C/K/Z/T
    private Integer capacity;    // 列车运量
    private Integer status;      // 状态 1-运营 0-停运
    
    // 获取列车类型名称
    public String getTypeName() {
        if (trainCode == null || trainCode.isEmpty()) return "其他";
        char first = trainCode.charAt(0);
        switch (first) {
            case 'G': return "高铁";
            case 'D': return "动车";
            case 'C': return "城际";
            case 'K': return "快速";
            case 'Z': return "直达";
            case 'T': return "特快";
            default: return "普通";
        }
    }
}
