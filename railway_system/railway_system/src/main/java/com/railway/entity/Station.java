package com.railway.entity;

import lombok.Data;

/**
 * 站点实体类
 */
@Data
public class Station {
    private Integer id;           // 站点ID
    private String stationName;   // 站点名称
    private String stationCode;   // 站点编码
    private String stationType;   // 站点类型：枢纽站/中间站/通过站
    private Integer platforms;    // 站台数量
    private String remark;        // 备注
    
    // 判断是否为枢纽站
    public boolean isHub() {
        if (stationName == null) return false;
        return stationName.contains("成都") || stationName.contains("重庆");
    }
}
